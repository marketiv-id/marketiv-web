/**
 * Spike 2 — upload file besar ke Supabase Storage lewat signed upload URL.
 *
 * Target arsitektur: route handler membuat signed upload URL (service role), browser
 * mengunggah langsung ke Storage dengan token itu. Spike ini meniru kedua sisi dari Node.
 *
 * Uji:
 *   A. createSignedUploadUrl + uploadToSignedUrl (standard upload, satu request)
 *   B. createSignedUploadUrl + TUS resumable (header x-signature, chunk 6 MB)
 *   C. File di atas batas bucket → harus ditolak
 *   D. Ukuran objek tersimpan == ukuran yang dikirim
 *
 * Batas: project Free maksimal 50 MB per file (global). Target produksi 500 MB butuh Pro.
 * SPIKE_FILE_MB mengatur ukuran uji (default 49). SPIKE_BUCKET_LIMIT_MB mengatur batas bucket (default 50).
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * Jalankan: NODE_USE_ENV_PROXY=1 node spike2-large-upload.mjs [--keep]
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { requireEnv, nowIso } from "./_lib.mjs";

const KEEP = process.argv.includes("--keep");
const env = requireEnv("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY");
const FILE_MB = Number(process.env.SPIKE_FILE_MB || 49);
const LIMIT_MB = Number(process.env.SPIKE_BUCKET_LIMIT_MB || 50);
const MB = 1024 * 1024; // TUS chunk (6 MiB)
const MB_DEC = 1_000_000; // Supabase menghitung batas ukuran dalam MB desimal
const BUCKET = "spike-upload";
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
const STORAGE_HOST = `https://${ref}.storage.supabase.co`;

const authOpts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, authOpts);
const browser = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, authOpts); // tanpa sesi: hanya token signed

const result = { spike: "spike2-large-upload", startedAt: nowIso(), fileMb: FILE_MB, bucketLimitMb: LIMIT_MB, tests: [] };
const record = (name, ok, detail = {}) => {
  result.tests.push({ name, ok, ...detail });
  console.error(`${ok ? "OK  " : "FAIL"} ${name} ${JSON.stringify(detail)}`);
};
const mbps = (bytes, ms) => +((bytes / MB_DEC) / (ms / 1000)).toFixed(2);

async function ensureBucket() {
  const opts = { public: false, fileSizeLimit: `${LIMIT_MB}MB` };
  const { data } = await admin.storage.getBucket(BUCKET);
  const { error } = data
    ? await admin.storage.updateBucket(BUCKET, opts)
    : await admin.storage.createBucket(BUCKET, opts);
  if (error) throw new Error(`Bucket ${BUCKET}: ${error.message}`);
}

async function objectSize(path) {
  const dir = path.split("/").slice(0, -1).join("/");
  const name = path.split("/").pop();
  const { data, error } = await admin.storage.from(BUCKET).list(dir, { search: name });
  if (error) throw error;
  return data.find((o) => o.name === name)?.metadata?.size ?? null;
}

/** Klien TUS minimal di atas fetch (fetch Node mengikuti proxy env; modul http tidak). */
async function tusUpload({ path, token, body, chunk = 6 * MB }) {
  const endpoint = `${STORAGE_HOST}/storage/v1/upload/resumable/sign`;
  const b64 = (s) => Buffer.from(s).toString("base64");
  const meta = [
    `bucketName ${b64(BUCKET)}`,
    `objectName ${b64(path)}`,
    `contentType ${b64("application/octet-stream")}`,
    `cacheControl ${b64("3600")}`,
  ].join(",");
  const baseHeaders = { "Tus-Resumable": "1.0.0", "x-signature": token, apikey: env.SUPABASE_ANON_KEY };

  const create = await fetch(endpoint, {
    method: "POST",
    headers: { ...baseHeaders, "Upload-Length": String(body.length), "Upload-Metadata": meta },
  });
  if (create.status !== 201) throw new Error(`TUS create ${create.status}: ${(await create.text()).slice(0, 200)}`);
  const location = new URL(create.headers.get("location"), STORAGE_HOST).toString();

  let offset = 0;
  let patches = 0;
  let retries = 0;
  while (offset < body.length) {
    const slice = body.subarray(offset, Math.min(offset + chunk, body.length));
    const res = await fetch(location, {
      method: "PATCH",
      headers: { ...baseHeaders, "Upload-Offset": String(offset), "Content-Type": "application/offset+octet-stream" },
      body: slice,
    });
    if (res.status !== 204) {
      // Resume: tanya offset terakhir ke server lalu lanjut (inti dari TUS).
      if (++retries > 5) throw new Error(`TUS PATCH ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const head = await fetch(location, { method: "HEAD", headers: baseHeaders });
      offset = Number(head.headers.get("upload-offset") || offset);
      continue;
    }
    offset = Number(res.headers.get("upload-offset"));
    patches++;
  }
  return { patches, retries };
}

/** Uji resume: kirim sebagian, "putus", tanya offset ke server, lanjut dari situ. */
async function tusResumeCheck({ path, token, body }) {
  const endpoint = `${STORAGE_HOST}/storage/v1/upload/resumable/sign`;
  const b64 = (s) => Buffer.from(s).toString("base64");
  const meta = `bucketName ${b64(BUCKET)},objectName ${b64(path)},contentType ${b64("application/octet-stream")}`;
  const h = { "Tus-Resumable": "1.0.0", "x-signature": token, apikey: env.SUPABASE_ANON_KEY };
  const create = await fetch(endpoint, { method: "POST", headers: { ...h, "Upload-Length": String(body.length), "Upload-Metadata": meta } });
  if (create.status !== 201) throw new Error(`TUS create ${create.status}`);
  const location = new URL(create.headers.get("location"), STORAGE_HOST).toString();
  const first = await fetch(location, {
    method: "PATCH",
    headers: { ...h, "Upload-Offset": "0", "Content-Type": "application/offset+octet-stream" },
    body: body.subarray(0, 6 * MB),
  });
  if (first.status !== 204) throw new Error(`PATCH pertama ${first.status}`);
  const head = await fetch(location, { method: "HEAD", headers: h });
  const serverOffset = Number(head.headers.get("upload-offset"));
  let offset = serverOffset;
  while (offset < body.length) {
    const res = await fetch(location, {
      method: "PATCH",
      headers: { ...h, "Upload-Offset": String(offset), "Content-Type": "application/offset+octet-stream" },
      body: body.subarray(offset, Math.min(offset + 6 * MB, body.length)),
    });
    if (res.status !== 204) throw new Error(`PATCH lanjutan ${res.status}`);
    offset = Number(res.headers.get("upload-offset"));
  }
  return { serverOffsetAfterInterrupt: serverOffset };
}

const created = [];
try {
  await ensureBucket();
  record("bucket.ensure", true, { bucket: BUCKET, private: true, limitMb: LIMIT_MB });

  const body = crypto.randomBytes(Math.round(FILE_MB * MB_DEC));

  // A. Standard signed upload
  {
    const path = `spike/standard-${Date.now()}.bin`;
    const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    const t = Date.now();
    const { error: upErr } = await browser.storage.from(BUCKET).uploadToSignedUrl(path, signed.token, body, {
      contentType: "application/octet-stream",
    });
    const ms = Date.now() - t;
    if (!upErr) created.push(path);
    const size = upErr ? null : await objectSize(path);
    record("A.signedUrl.standard", !upErr && size === body.length, {
      ms, mbPerSec: mbps(body.length, ms), storedBytes: size, sentBytes: body.length,
      ...(upErr ? { error: upErr.message } : {}),
    });
  }

  // B. TUS resumable dengan token signed
  {
    const path = `spike/tus-${Date.now()}.bin`;
    const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    const t = Date.now();
    try {
      const info = await tusUpload({ path, token: signed.token, body });
      const ms = Date.now() - t;
      created.push(path);
      const size = await objectSize(path);
      record("B.signedUrl.tusResumable", size === body.length, { ms, mbPerSec: mbps(body.length, ms), storedBytes: size, ...info });
    } catch (e) {
      record("B.signedUrl.tusResumable", false, { error: String(e.message).slice(0, 200) });
    }
  }

  // B2. TUS: putus di tengah lalu resume dari offset server
  {
    const path = `spike/tus-resume-${Date.now()}.bin`;
    const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    const small = body.subarray(0, 20 * MB_DEC);
    try {
      const info = await tusResumeCheck({ path, token: signed.token, body: small });
      created.push(path);
      const size = await objectSize(path);
      record("B2.tus.resumeAfterInterrupt", size === small.length && info.serverOffsetAfterInterrupt === 6 * MB, {
        storedBytes: size, ...info,
      });
    } catch (e) {
      record("B2.tus.resumeAfterInterrupt", false, { error: String(e.message).slice(0, 200) });
    }
  }

  // C. Di atas batas bucket → wajib ditolak
  {
    const path = `spike/oversize-${Date.now()}.bin`;
    const over = crypto.randomBytes((LIMIT_MB + 1) * MB_DEC);
    const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    const { error: upErr } = await browser.storage.from(BUCKET).uploadToSignedUrl(path, signed.token, over);
    if (!upErr) created.push(path);
    record("C.oversizeRejected", Boolean(upErr), {
      sentMb: LIMIT_MB + 1,
      ...(upErr ? { error: String(upErr.message).slice(0, 120), status: upErr.statusCode ?? upErr.status } : { error: "file di atas batas DITERIMA" }),
    });
  }

  // C2. Batas bucket 500 MB di project Free → harus ditolak oleh batas global
  {
    const { error } = await admin.storage.updateBucket(BUCKET, { public: false, fileSizeLimit: "500MB" });
    record("C2.bucketLimit500MbOnFree", true, {
      accepted: !error,
      ...(error ? { error: String(error.message).slice(0, 160) } : {}),
      note: "accepted=false berarti batas 500 MB butuh plan Pro",
    });
    await admin.storage.updateBucket(BUCKET, { public: false, fileSizeLimit: `${LIMIT_MB}MB` });
  }
} catch (err) {
  result.error = String(err?.message || err).slice(0, 300);
} finally {
  if (!KEEP) {
    if (created.length) await admin.storage.from(BUCKET).remove(created);
    const { error } = await admin.storage.deleteBucket(BUCKET);
    record("cleanup", !error, error ? { error: error.message } : { removedObjects: created.length });
  }
}

const core = result.tests.filter((t) => /^[ABC]\./.test(t.name) || t.name.startsWith("B2."));
result.verdict = !result.error && core.length >= 4 && core.every((t) => t.ok) ? "BERHASIL (≤ batas Free)" : "GAGAL";
result.finishedAt = nowIso();
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.verdict.startsWith("BERHASIL") ? 0 : 1;
