/**
 * Backup lengkap Appwrite produksi ke satu arsip .7z terenkripsi (AES-256, nama file ikut dienkripsi).
 *
 * READ-ONLY terhadap Appwrite: hanya GET. Tidak menulis apa pun ke Appwrite.
 *
 * Isi arsip:
 *   manifest.json            jumlah baris/file/user, waktu backup, project & database
 *   schema/tables.json       metadata tabel (kolom, index, permission)
 *   schema/buckets.json      metadata bucket
 *   schema/functions.json    konfigurasi Function (tanpa nilai variabel/secret)
 *   tables/<tableId>.json    semua baris tiap tabel, apa adanya ($id, $permissions, $createdAt, ...)
 *   auth/users.json          semua akun Auth, termasuk hash password (PII, rahasia)
 *   storage/<bucket>/files.json        metadata file
 *   storage/<bucket>/<fileId>/<nama>   isi file
 *
 * Env:
 *   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID   (produksi, key read-only)
 *   BACKUP_PASSWORD   kata sandi arsip (wajib, kecuali --no-encrypt)
 *
 * Opsi:
 *   --endpoint <url>   timpa APPWRITE_ENDPOINT (mis. https://sgp.cloud.appwrite.io/v1 bila custom domain diblok)
 *   --out-dir <dir>    folder hasil, WAJIB di luar repo (default: ./backup-out dari folder saat ini; ditolak bila di dalam repo)
 *   --no-encrypt       hanya untuk uji: tulis folder mentah tanpa membuat arsip
 *
 * Jalankan (di sesi cloud butuh proxy):
 *   cd scripts/migration/backup && npm ci
 *   NODE_USE_ENV_PROXY=1 node export-appwrite-backup.mjs --out-dir /path/di/luar/repo
 *
 * Buka arsip: `7z x marketiv-appwrite-backup-<waktu>.7z` lalu masukkan kata sandi, atau klik dua kali di file manager.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
};
const NO_ENCRYPT = process.argv.includes("--no-encrypt");

const need = ["APPWRITE_PROJECT_ID", "APPWRITE_API_KEY", "APPWRITE_DATABASE_ID"];
if (!NO_ENCRYPT) need.push("BACKUP_PASSWORD");
const missing = need.filter((n) => !process.env[n]);
if (missing.length) throw new Error(`Env wajib belum diset: ${missing.join(", ")}`);

const ENDPOINT = (arg("--endpoint") || process.env.APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1").replace(/\/+$/, "");
const PROJECT = process.env.APPWRITE_PROJECT_ID;
const KEY = process.env.APPWRITE_API_KEY;
const DB = process.env.APPWRITE_DATABASE_ID;

const repoRoot = path.resolve(new URL("../../..", import.meta.url).pathname);
const outRoot = path.resolve(arg("--out-dir") || path.join(process.cwd(), "backup-out"));
if (outRoot === repoRoot || outRoot.startsWith(repoRoot + path.sep)) {
  throw new Error("--out-dir harus di luar repo: backup berisi PII dan hash password.");
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const name = `marketiv-appwrite-backup-${stamp}`;
const work = path.join(outRoot, name);
fs.mkdirSync(work, { recursive: true, mode: 0o700 });

const headers = { "X-Appwrite-Project": PROJECT, "X-Appwrite-Key": KEY };
async function get(pathname, queries = [], { raw = false } = {}) {
  let url = ENDPOINT + pathname;
  if (queries.length) url += "?" + queries.map((q) => "queries[]=" + encodeURIComponent(JSON.stringify(q))).join("&");
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return raw ? Buffer.from(await res.arrayBuffer()) : res.json();
    const text = await res.text();
    if (attempt >= 3 || (res.status < 500 && res.status !== 429)) {
      throw new Error(`${res.status} GET ${pathname} :: ${text.slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
}
async function listAll(pathname, key) {
  const out = [];
  let cursor = null;
  for (;;) {
    const q = [{ method: "limit", values: [100] }];
    if (cursor) q.push({ method: "cursorAfter", values: [cursor] });
    const items = (await get(pathname, q))[key] || [];
    out.push(...items);
    if (items.length < 100) return out;
    cursor = items[items.length - 1].$id;
  }
}
const write = (rel, data) => {
  const p = path.join(work, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2), { mode: 0o600 });
};
const safe = (s) => String(s).replace(/[^\w.\-]+/g, "_").slice(0, 120) || "file";

const manifest = { createdAt: new Date().toISOString(), endpoint: ENDPOINT, projectId: PROJECT, databaseId: DB, tables: {}, buckets: {}, authUsers: 0 };

// Skema + baris
const tables = await listAll(`/tablesdb/${DB}/tables`, "tables");
write("schema/tables.json", tables);
for (const t of tables) {
  const rows = await listAll(`/tablesdb/${DB}/tables/${t.$id}/rows`, "rows");
  write(`tables/${t.$id}.json`, rows);
  manifest.tables[t.$id] = rows.length;
}
console.error(`tabel: ${tables.length}, baris: ${Object.values(manifest.tables).reduce((a, n) => a + n, 0)}`);

// Auth
const users = await listAll("/users", "users");
write("auth/users.json", users);
manifest.authUsers = users.length;
console.error(`user Auth: ${users.length}`);

// Function (konfigurasi saja; nilai variabel tidak diambil)
try {
  const fns = await listAll("/functions", "functions");
  write("schema/functions.json", fns);
  manifest.functions = fns.length;
} catch (e) {
  manifest.functions = `gagal dibaca: ${String(e.message).slice(0, 80)}`;
}

// Storage
const buckets = await listAll("/storage/buckets", "buckets");
write("schema/buckets.json", buckets);
for (const b of buckets) {
  const files = await listAll(`/storage/buckets/${b.$id}/files`, "files");
  write(`storage/${b.$id}/files.json`, files);
  let bytes = 0;
  for (const f of files) {
    const data = await get(`/storage/buckets/${b.$id}/files/${f.$id}/download`, [], { raw: true });
    if (f.sizeOriginal && data.length !== f.sizeOriginal) {
      throw new Error(`Ukuran file ${b.$id}/${f.$id} tidak cocok: ${data.length} ≠ ${f.sizeOriginal}`);
    }
    write(`storage/${b.$id}/${f.$id}/${safe(f.name)}`, data);
    bytes += data.length;
  }
  manifest.buckets[b.$id] = { files: files.length, bytes };
}
console.error(`bucket: ${buckets.length}, file: ${Object.values(manifest.buckets).reduce((a, b) => a + b.files, 0)}`);
write("manifest.json", manifest);

if (NO_ENCRYPT) {
  console.log(JSON.stringify({ folder: work, manifest }, null, 2));
  process.exit(0);
}

// Arsip terenkripsi
const sevenZip = require("7zip-bin").path7za;
fs.chmodSync(sevenZip, 0o755);
const archive = path.join(outRoot, `${name}.7z`);
execFileSync(sevenZip, ["a", "-t7z", "-mhe=on", `-p${process.env.BACKUP_PASSWORD}`, archive, `${work}/*`], { stdio: "ignore" });
execFileSync(sevenZip, ["t", `-p${process.env.BACKUP_PASSWORD}`, archive], { stdio: "ignore" }); // uji buka dengan kata sandi
fs.rmSync(work, { recursive: true, force: true }); // hapus folder mentah; yang tersisa hanya arsip terenkripsi
console.log(JSON.stringify({ archive, sizeBytes: fs.statSync(archive).size, manifest }, null, 2));
