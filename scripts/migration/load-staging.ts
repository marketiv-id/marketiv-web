/**
 * Loader sederhana: muat hasil `export-appwrite.ts` ke Supabase (lokal atau staging).
 *
 * Tujuan Fase 2: membuktikan skema menerima data Appwrite tanpa pelanggaran FK,
 * dan menyediakan data uji staging untuk Fase 5. Transform bisnis (A1 campaign
 * tanpa dana, role admin dari allowlist, dll.) BUKAN di sini; itu Fase 9.
 *
 * Alur:
 *   1. Akun Auth Appwrite → auth.users (admin API) + public.legacy_user_map.
 *      Idempoten: akun yang sudah ada di legacy_user_map dipakai ulang.
 *      Role TIDAK disalin ke app_metadata (Fase 4). Hash password hanya diimpor
 *      dengan --with-passwords.
 *   2. Tiap tabel (urutan induk → anak, lihat mapping.ts): transform, lalu upsert
 *      per batch. Batch yang gagal diulang per baris supaya baris yang ditolak bisa
 *      dihitung beserta alasannya (kode error Postgres).
 *   3. conversations.offer_id diisi di lintasan kedua, setelah offers dimuat.
 *
 * Laporan: <export-dir>/load-report-<target>-<waktu>.json (hanya ID dan alasan,
 * tanpa PII) + ringkasan di stdout. Exit code 1 bila ada baris yang ditolak FK.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (project tujuan).
 *
 * Opsi:
 *   --dir <export-dir>       folder hasil export-appwrite.ts (wajib)
 *   --target local|staging   wajib. local: URL harus 127.0.0.1/localhost.
 *   --confirm-ref <ref>      wajib untuk staging; harus sama dengan subdomain SUPABASE_URL
 *   --with-passwords         impor hash password Argon2 (login dengan password lama)
 *   --batch-size <n>         default 200
 *
 * Contoh lokal:
 *   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<dari `supabase status`> \
 *     node load-staging.ts --target local --dir .data/export-staging-…
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { parseArgs } from "node:util";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { CAMPAIGN_BRIEFS_V2_ID, TABLES, type ColumnMap, type TableMap } from "./mapping.ts";

type Row = Record<string, unknown>;
type PgRow = Record<string, unknown>;

const { values: args } = parseArgs({
  options: {
    dir: { type: "string" },
    target: { type: "string" },
    "confirm-ref": { type: "string" },
    "with-passwords": { type: "boolean", default: false },
    "batch-size": { type: "string", default: "200" },
  },
});

function fail(msg: string): never {
  console.error(`[load] ${msg}`);
  process.exit(2);
}

const exportDir = args.dir ? path.resolve(args.dir) : fail("--dir <export-dir> wajib");
if (!fs.existsSync(path.join(exportDir, "manifest.json"))) fail(`manifest.json tidak ada di ${exportDir}`);
const target = args.target;
if (target !== "local" && target !== "staging") fail("--target local|staging wajib");
const batchSize = Number(args["batch-size"]);
if (!Number.isInteger(batchSize) || batchSize < 1) fail("--batch-size harus bilangan bulat > 0");

const supabaseUrl = process.env.SUPABASE_URL ?? fail("Env SUPABASE_URL belum diset");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fail("Env SUPABASE_SERVICE_ROLE_KEY belum diset");
const host = new URL(supabaseUrl).hostname;
if (target === "local" && !["127.0.0.1", "localhost"].includes(host)) {
  fail(`--target local tapi SUPABASE_URL menunjuk ${host}`);
}
if (target === "staging") {
  const ref = host.split(".")[0];
  if (!args["confirm-ref"] || args["confirm-ref"] !== ref) {
    fail(`--target staging butuh --confirm-ref ${ref} (subdomain SUPABASE_URL) sebagai konfirmasi`);
  }
}

const supabase: SupabaseClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Laporan
// ---------------------------------------------------------------------------
interface TableReport {
  read: number;
  loaded: number;
  rejected: number;
  reasons: Record<string, number>;
  rejectedIds: { id: string; reason: string }[];
  notes: Record<string, number>;
}
const report: {
  target: string;
  supabaseHost: string;
  startedAt: string;
  finishedAt?: string;
  auth: TableReport;
  tables: Record<string, TableReport>;
} = {
  target,
  supabaseHost: host,
  startedAt: new Date().toISOString(),
  auth: newTableReport(),
  tables: {},
};

function newTableReport(): TableReport {
  return { read: 0, loaded: 0, rejected: 0, reasons: {}, rejectedIds: [], notes: {} };
}
function reject(r: TableReport, id: string, reason: string): void {
  r.rejected++;
  r.reasons[reason] = (r.reasons[reason] ?? 0) + 1;
  r.rejectedIds.push({ id, reason });
}
function note(r: TableReport, key: string): void {
  r.notes[key] = (r.notes[key] ?? 0) + 1;
}

/** Kode SQLSTATE → label alasan yang mudah dibaca. */
function reasonFromError(err: { code?: string; message?: string }): string {
  const code = err.code ?? "?";
  const labels: Record<string, string> = {
    "23503": "fk_violation",
    "23505": "unique_violation",
    "23514": "check_violation",
    "23502": "not_null_violation",
    "22P02": "invalid_text_representation",
    "22007": "invalid_datetime",
    "22003": "numeric_out_of_range",
  };
  const label = labels[code] ?? `pg_${code}`;
  // Nama constraint (tanpa nilai data) membantu menelusuri tanpa membocorkan PII.
  const constraint = /constraint "([^"]+)"/.exec(err.message ?? "")?.[1];
  return constraint ? `${label}:${constraint}` : label;
}

// ---------------------------------------------------------------------------
// Baca JSONL
// ---------------------------------------------------------------------------
async function readJsonl(file: string): Promise<Row[]> {
  if (!fs.existsSync(file)) return [];
  const rows: Row[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) rows.push(JSON.parse(line) as Row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 1. Akun Auth → auth.users + legacy_user_map
// ---------------------------------------------------------------------------
const userMap = new Map<string, string>(); // legacy Auth id → uuid

async function loadLegacyMap(): Promise<void> {
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("legacy_user_map")
      .select("legacy_user_id, user_id")
      .range(from, from + 999);
    if (error) throw new Error(`Baca legacy_user_map gagal: ${error.message}`);
    for (const r of data) userMap.set(r.legacy_user_id, r.user_id);
    if (data.length < 1000) return;
  }
}

async function findAuthUserByEmail(email: string): Promise<{ id: string; legacyId?: string } | null> {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (hit) return { id: hit.id, legacyId: hit.app_metadata?.legacy_user_id as string | undefined };
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function loadAuthUsers(): Promise<void> {
  const r = report.auth;
  const authUsers = await readJsonl(path.join(exportDir, "auth", "users.jsonl"));
  r.read = authUsers.length;
  await loadLegacyMap();

  for (const u of authUsers) {
    const legacyId = String(u.$id);
    if (userMap.has(legacyId)) {
      note(r, "sudah_ada_di_legacy_user_map");
      r.loaded++;
      continue;
    }
    const email = typeof u.email === "string" && u.email ? u.email.trim().toLowerCase() : null;
    if (!email) {
      reject(r, legacyId, "auth_tanpa_email");
      continue;
    }
    const hash = typeof u.password === "string" ? u.password : null;
    const isArgon = !!hash && /^\$argon2(id|i|d)\$/.test(hash);
    if (!hash) note(r, "tanpa_password");
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: Boolean(u.emailVerification),
      ...(args["with-passwords"] && isArgon ? { password_hash: hash } : {}),
      app_metadata: { legacy_user_id: legacyId, migrated_from: "appwrite" },
    });

    let uuid = data?.user?.id ?? null;
    if (error) {
      const existing = /already|exists|registered/i.test(error.message) ? await findAuthUserByEmail(email) : null;
      if (existing && existing.legacyId === legacyId) {
        uuid = existing.id;
        note(r, "dipakai_ulang_dari_run_sebelumnya");
      } else {
        reject(r, legacyId, existing ? "email_dipakai_akun_lain" : `auth_error:${error.code ?? error.status ?? "?"}`);
        continue;
      }
    }
    const { error: mapErr } = await supabase
      .from("legacy_user_map")
      .upsert({ legacy_user_id: legacyId, user_id: uuid }, { onConflict: "legacy_user_id" });
    if (mapErr) {
      reject(r, legacyId, `legacy_user_map:${reasonFromError(mapErr)}`);
      continue;
    }
    userMap.set(legacyId, uuid as string);
    r.loaded++;
  }
}

// ---------------------------------------------------------------------------
// 2. Transform baris Appwrite → Postgres
// ---------------------------------------------------------------------------
class RowRejected extends Error {}

function toTimestamp(v: unknown, lenient: boolean): string | null {
  if (v == null || v === "") return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) {
    throw new RowRejected(lenient ? "tanggal_tidak_valid" : "datetime_tidak_valid");
  }
  return d.toISOString();
}

function convert(col: ColumnMap, v: unknown, r: TableReport): unknown {
  if (v === undefined || v === null) return null;
  switch (col.kind) {
    case "text":
      return String(v);
    case "lower":
      return String(v).trim().toLowerCase();
    case "int":
    case "money": {
      const n = Number(v);
      if (!Number.isFinite(n) || !Number.isInteger(n)) throw new RowRejected(`bukan_bilangan_bulat:${col.pg}`);
      return n;
    }
    case "number": {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new RowRejected(`bukan_angka:${col.pg}`);
      return n;
    }
    case "bool":
      return Boolean(v);
    case "ts":
      return toTimestamp(v, false);
    case "ts_lenient":
      return toTimestamp(v, true);
    case "user": {
      const uuid = userMap.get(String(v));
      if (!uuid) throw new RowRejected(`user_tidak_dikenal:${col.pg}`);
      return uuid;
    }
    case "text_array":
      return Array.isArray(v) ? v.map((x) => String(x).trim().toLowerCase()) : [String(v).toLowerCase()];
    case "json_object": {
      if (typeof v === "object") return v;
      const s = String(v).trim();
      if (!s) return null;
      try {
        const parsed: unknown = JSON.parse(s);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      } catch {
        // jatuh ke bawah
      }
      note(r, `json_tidak_valid_dibuang:${col.pg}`);
      return null;
    }
    case "json_array": {
      if (Array.isArray(v)) return v;
      const s = String(v).trim();
      if (!s) return null;
      try {
        const parsed: unknown = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // jatuh ke bawah
      }
      note(r, `json_tidak_valid_dibuang:${col.pg}`);
      return null;
    }
  }
}

function transform(t: TableMap, row: Row, r: TableReport): PgRow {
  const out: PgRow = {};
  if (t.pg === "users") {
    const uuid = userMap.get(String(row.userId ?? ""));
    if (!uuid) throw new RowRejected("akun_auth_tidak_ada");
    out.id = uuid;
  } else {
    out.id = String(row.$id);
  }
  for (const [awKey, col] of Object.entries(t.columns)) {
    const value = convert(col, row[awKey], r);
    // null → kolom tidak dikirim, sehingga DB memakai default (defaultToNull: false).
    if (value !== null) out[col.pg] = value;
  }
  const createdAt = toTimestamp((t.createdAtFrom && row[t.createdAtFrom]) || row.$createdAt, false);
  const updatedAt = toTimestamp((t.updatedAtFrom && row[t.updatedAtFrom]) || row.$updatedAt, false);
  if (createdAt) out.created_at = createdAt;
  if (updatedAt) out.updated_at = updatedAt;
  return out;
}

// ---------------------------------------------------------------------------
// 3. Upsert per batch, fallback per baris
// ---------------------------------------------------------------------------
async function upsertRows(table: string, rows: PgRow[], r: TableReport): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "id", defaultToNull: false });
    if (!error) {
      r.loaded += batch.length;
      continue;
    }
    for (const row of batch) {
      const { error: rowErr } = await supabase.from(table).upsert(row, { onConflict: "id", defaultToNull: false });
      if (rowErr) reject(r, String(row.id), reasonFromError(rowErr));
      else r.loaded++;
    }
  }
}

async function loadTable(t: TableMap): Promise<void> {
  const r = newTableReport();
  report.tables[t.pg] = r;

  // Gabung semua sumber; sumber belakangan menang bila id atau dedupBy sama.
  const byKey = new Map<string, PgRow>();
  for (const source of t.sources) {
    const rows = await readJsonl(path.join(exportDir, "tables", `${source}.jsonl`));
    r.read += rows.length;
    for (const row of rows) {
      let pg: PgRow;
      try {
        pg = transform(t, row, r);
      } catch (err) {
        if (err instanceof RowRejected) {
          reject(r, String(row.$id), err.message);
          continue;
        }
        throw err;
      }
      const key = t.dedupBy ? String(pg[t.dedupBy]) : String(pg.id);
      const prev = byKey.get(key);
      if (prev) {
        note(r, source === CAMPAIGN_BRIEFS_V2_ID ? "brief_lama_diganti_v2" : "duplikat_diganti_sumber_belakangan");
        // Baris pemenang (sumber belakangan, mis. brief v2) dipakai utuh, termasuk ID-nya.
        // Brief tidak dirujuk tabel lain, jadi ID baris yang kalah aman dibuang.
      }
      byKey.set(key, pg);
    }
  }
  if (t.dedupBy) {
    const merged = r.read - byKey.size - r.rejected;
    r.notes.digabung_tidak_dimuat_terpisah = merged;
  }

  let rows = [...byKey.values()];
  // conversations: offer_id diisi setelah offers ada (siklus FK).
  if (t.pg === "conversations") {
    for (const row of rows) {
      if (row.offer_id) pendingConversationOffers.set(String(row.id), String(row.offer_id));
    }
    rows = rows.map(({ offer_id: _drop, ...rest }) => rest);
  }
  await upsertRows(t.pg, rows, r);
}

const pendingConversationOffers = new Map<string, string>();

async function linkConversationOffers(): Promise<void> {
  const r = report.tables.conversations;
  for (const [conversationId, offerId] of pendingConversationOffers) {
    const { error } = await supabase.from("conversations").update({ offer_id: offerId }).eq("id", conversationId);
    if (error) {
      note(r, `offer_id_tidak_ditautkan:${reasonFromError(error)}`);
      r.rejectedIds.push({ id: conversationId, reason: `offer_id:${reasonFromError(error)}` });
    } else {
      note(r, "offer_id_ditautkan");
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
await loadAuthUsers();
for (const t of TABLES) {
  await loadTable(t);
  if (t.pg === "users") {
    // Simpan $id lama baris tabel users (≠ ID Auth) di legacy_user_map, untuk audit.
    const users = await readJsonl(path.join(exportDir, "tables", "users.jsonl"));
    for (const u of users) {
      const legacyId = String(u.userId ?? "");
      if (!userMap.has(legacyId)) continue;
      await supabase
        .from("legacy_user_map")
        .update({ legacy_users_row_id: String(u.$id) })
        .eq("legacy_user_id", legacyId);
    }
  }
  if (t.pg === "offers") await linkConversationOffers();
}
report.finishedAt = new Date().toISOString();

const stamp = report.startedAt.replace(/[:.]/g, "-").slice(0, 19);
const reportFile = path.join(exportDir, `load-report-${target}-${stamp}.json`);
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), { mode: 0o600 });

const summary = [
  { tabel: "auth.users", dibaca: report.auth.read, dimuat: report.auth.loaded, ditolak: report.auth.rejected },
  ...Object.entries(report.tables).map(([name, t]) => ({
    tabel: name,
    dibaca: t.read,
    dimuat: t.loaded,
    ditolak: t.rejected,
  })),
];
console.table(summary);
const fkRejected = Object.values(report.tables).reduce(
  (n, t) =>
    n + Object.entries(t.reasons).filter(([k]) => k.startsWith("fk_violation")).reduce((s, [, v]) => s + v, 0),
  0,
);
const totalRejected = summary.reduce((n, s) => n + s.ditolak, 0);
console.log(JSON.stringify({ reportFile, totalRejected, fkRejected }, null, 2));
process.exitCode = fkRejected > 0 ? 1 : 0;
