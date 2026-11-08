/**
 * Export semua tabel Appwrite (TablesDB) + akun Auth ke JSONL, satu file per tabel.
 *
 * READ-ONLY terhadap Appwrite: hanya memanggil list (GET). Tidak ada tulis.
 * Dipakai untuk memuat data uji ke Supabase staging (Fase 2) dan nanti
 * sebagai tahap "extract" migrasi data (Fase 9).
 *
 * Target WAJIB dipilih eksplisit, karena default di repo (appwrite.config.json,
 * 00_BACKEND/appwrite/ops/client.mjs) menunjuk project STAGING:
 *   --target prod     → APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID
 *   --target staging  → APPWRITE_STAGING_ENDPOINT, APPWRITE_STAGING_PROJECT_ID, APPWRITE_STAGING_API_KEY,
 *                       APPWRITE_STAGING_DATABASE_ID (fallback: APPWRITE_DATABASE_ID; ID database
 *                       staging dan produksi sama)
 *
 * Opsi:
 *   --out-dir <dir>   folder hasil (default: scripts/migration/.data/export-<target>-<waktu>).
 *                     Folder `.data/` di-.gitignore. Hasil berisi PII dan hash password:
 *                     JANGAN di-commit, jangan dibagikan.
 *   --no-auth         jangan export akun Auth (tanpa hash password)
 *   --page-size <n>   ukuran halaman cursor (default 100, maks 5000)
 *
 * Keluaran:
 *   <out>/tables/<tableId>.jsonl   satu baris JSON per row, apa adanya ($id, $createdAt, $updatedAt, kolom)
 *   <out>/auth/users.jsonl         akun Auth (termasuk hash password), kecuali --no-auth
 *   <out>/manifest.json            target, waktu, peta tableId → nama, jumlah baris
 *
 * Jalankan (Node >= 22.18; di sesi cloud set NODE_USE_ENV_PROXY=1):
 *   cd scripts/migration && npm ci
 *   node export-appwrite.ts --target staging
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { Client, Query, TablesDB, Users } from "node-appwrite";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

type Target = "prod" | "staging";

const { values: args } = parseArgs({
  options: {
    target: { type: "string" },
    "out-dir": { type: "string" },
    "no-auth": { type: "boolean", default: false },
    "page-size": { type: "string", default: "100" },
  },
});

const target = args.target as Target | undefined;
if (target !== "prod" && target !== "staging") {
  throw new Error("Pilih target secara eksplisit: --target prod | --target staging");
}
const pageSize = Number(args["page-size"]);
if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 5000) {
  throw new Error("--page-size harus bilangan bulat 1..5000");
}

function requireEnv(...names: string[]): Record<string, string> {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length > 0) throw new Error(`Env wajib belum diset: ${missing.join(", ")}`);
  return Object.fromEntries(names.map((n) => [n, process.env[n] as string]));
}

const prefix = target === "staging" ? "APPWRITE_STAGING_" : "APPWRITE_";
const env = requireEnv(`${prefix}ENDPOINT`, `${prefix}PROJECT_ID`, `${prefix}API_KEY`);
const endpoint = env[`${prefix}ENDPOINT`].replace(/\/+$/, "");
const projectId = env[`${prefix}PROJECT_ID`];
const databaseId =
  (target === "staging" ? process.env.APPWRITE_STAGING_DATABASE_ID : undefined) ??
  requireEnv("APPWRITE_DATABASE_ID").APPWRITE_DATABASE_ID;

// node-appwrite memakai undici sendiri; arahkan lewat proxy bila sesi memakainya.
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(env[`${prefix}API_KEY`]);
const tablesDb = new TablesDB(client);
const users = new Users(client);

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.resolve(args["out-dir"] ?? path.join(scriptDir, ".data", `export-${target}-${stamp}`));
fs.mkdirSync(path.join(outDir, "tables"), { recursive: true, mode: 0o700 });

/** Paginasi cursor generik: berhenti saat halaman < pageSize. */
async function* paginate<T extends { $id: string }>(
  fetchPage: (queries: string[]) => Promise<T[]>,
): AsyncGenerator<T> {
  let cursor: string | null = null;
  for (;;) {
    const queries = [Query.limit(pageSize), Query.orderAsc("$id")];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await withRetry(() => fetchPage(queries));
    for (const item of page) yield item;
    if (page.length < pageSize) return;
    cursor = page[page.length - 1].$id;
  }
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: number }).code ?? 0;
      const retryable = code === 0 || code === 429 || code >= 500;
      if (!retryable || attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

async function writeJsonl<T>(file: string, items: AsyncIterable<T>): Promise<number> {
  const stream = fs.createWriteStream(file, { mode: 0o600 });
  let count = 0;
  for await (const item of items) {
    if (!stream.write(JSON.stringify(item) + "\n")) {
      await new Promise<void>((r) => stream.once("drain", () => r()));
    }
    count++;
  }
  await new Promise<void>((resolve, reject) => stream.end((err?: Error | null) => (err ? reject(err) : resolve())));
  return count;
}

const manifest: {
  target: Target;
  endpoint: string;
  projectId: string;
  databaseId: string;
  startedAt: string;
  finishedAt?: string;
  tables: Record<string, { name: string; rows: number }>;
  authUsers: number | null;
} = {
  target,
  endpoint,
  projectId,
  databaseId,
  startedAt: new Date().toISOString(),
  tables: {},
  authUsers: null,
};

const tables: { $id: string; name: string }[] = [];
for await (const t of paginate((queries) =>
  tablesDb.listTables({ databaseId, queries }).then((r) => r.tables),
)) {
  tables.push({ $id: t.$id, name: t.name });
}
console.error(`[export] ${target}: ${tables.length} tabel di database ${databaseId}`);

for (const t of tables) {
  const rows = await writeJsonl(
    path.join(outDir, "tables", `${t.$id}.jsonl`),
    paginate((queries) => tablesDb.listRows({ databaseId, tableId: t.$id, queries }).then((r) => r.rows)),
  );
  manifest.tables[t.$id] = { name: t.name, rows };
  console.error(`[export]   ${t.$id.padEnd(34)} ${String(rows).padStart(7)} baris`);
}

if (!args["no-auth"]) {
  fs.mkdirSync(path.join(outDir, "auth"), { recursive: true, mode: 0o700 });
  manifest.authUsers = await writeJsonl(
    path.join(outDir, "auth", "users.jsonl"),
    paginate((queries) => users.list({ queries }).then((r) => r.users)),
  );
  console.error(`[export] akun Auth: ${manifest.authUsers}`);
}

manifest.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });

const totalRows = Object.values(manifest.tables).reduce((sum, t) => sum + t.rows, 0);
console.log(JSON.stringify({ outDir, tables: tables.length, totalRows, authUsers: manifest.authUsers }, null, 2));
