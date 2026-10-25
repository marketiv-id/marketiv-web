/**
 * Spike 1 — impor hash password Argon2 dari Appwrite ke Supabase Auth.
 *
 * Alur:
 *   1. Baca 1 user uji dari Appwrite STAGING (GET /users, read-only) berdasarkan SPIKE_TEST_EMAIL.
 *   2. Validasi bentuk hash (Argon2 PHC). Nilai hash TIDAK pernah dicetak.
 *   3. Buat user di Supabase staging lewat auth.admin.createUser({ password_hash }).
 *   4. Login memakai password lama (SPIKE_TEST_PASSWORD) dengan anon key → harus berhasil.
 *   5. Kontrol negatif: password salah → harus ditolak.
 *   6. Hapus user uji dari Supabase (kecuali --keep).
 *
 * Env: APPWRITE_STAGING_ENDPOINT, APPWRITE_STAGING_PROJECT_ID, APPWRITE_STAGING_API_KEY,
 *      SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *      SPIKE_TEST_EMAIL, SPIKE_TEST_PASSWORD
 *
 * Jalankan (di balik proxy, Node >= 22.21):
 *   NODE_USE_ENV_PROXY=1 node spike1-password-import.mjs [--keep]
 */
import { createClient } from "@supabase/supabase-js";
import { appwriteClient, requireEnv, phcShape, nowIso } from "./_lib.mjs";

const KEEP = process.argv.includes("--keep");
const env = requireEnv(
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SPIKE_TEST_EMAIL",
  "SPIKE_TEST_PASSWORD"
);
const email = env.SPIKE_TEST_EMAIL.trim().toLowerCase();
const result = { spike: "spike1-password-import", startedAt: nowIso(), steps: [] };
const step = (name, ok, detail = {}) => {
  result.steps.push({ name, ok, ...detail });
  console.error(`${ok ? "OK  " : "FAIL"} ${name} ${Object.keys(detail).length ? JSON.stringify(detail) : ""}`);
};

const authOpts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, authOpts);
const anon = () => createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, authOpts);

async function findSupabaseUserByEmail(target) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

try {
  // 1. Export dari Appwrite staging
  const aw = appwriteClient("staging");
  const res = await aw.get("/users", [
    { method: "equal", attribute: "email", values: [email] },
    { method: "limit", values: [2] },
  ]);
  const legacy = res.users?.[0];
  if (!legacy) throw new Error("User uji tidak ditemukan di Appwrite staging (cek SPIKE_TEST_EMAIL).");
  step("appwrite.export", true, {
    legacyUserId: legacy.$id,
    hash: legacy.hash,
    hashOptions: legacy.hashOptions,
    passwordShape: phcShape(legacy.password),
    emailVerification: legacy.emailVerification,
  });

  // 2. Validasi bentuk hash
  const isArgonPhc = typeof legacy.password === "string" && /^\$argon2(id|i|d)\$v=\d+\$m=\d+,t=\d+,p=\d+\$/.test(legacy.password);
  step("hash.isArgon2Phc", isArgonPhc);
  if (!isArgonPhc) throw new Error(`Format hash bukan Argon2 PHC: ${phcShape(legacy.password)}`);

  // 3. Import ke Supabase staging (idempoten: hapus sisa run sebelumnya)
  const existing = await findSupabaseUserByEmail(email);
  if (existing) {
    // Hanya hapus sisa run spike sebelumnya. User lain dengan email sama tidak pernah disentuh.
    if (existing.app_metadata?.spike !== true) {
      throw new Error("Email uji sudah dipakai user Supabase yang bukan buatan spike. Dibatalkan tanpa menghapus apa pun.");
    }
    const { error } = await admin.auth.admin.deleteUser(existing.id);
    if (error) throw error;
    step("supabase.cleanupPrevious", true);
  }
  const t0 = Date.now();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password_hash: legacy.password,
    email_confirm: Boolean(legacy.emailVerification),
    app_metadata: { legacy_user_id: legacy.$id, migrated_from: "appwrite", spike: true },
  });
  if (createErr) {
    step("supabase.createUser", false, { error: createErr.message, status: createErr.status, code: createErr.code });
    throw createErr;
  }
  step("supabase.createUser", true, { ms: Date.now() - t0, supabaseUserId: created.user.id });

  // 4. Login dengan password lama
  const t1 = Date.now();
  const { data: signIn, error: signInErr } = await anon().auth.signInWithPassword({
    email,
    password: env.SPIKE_TEST_PASSWORD,
  });
  const loginOk = !signInErr && Boolean(signIn?.session?.access_token);
  step("supabase.signIn.oldPassword", loginOk, {
    ms: Date.now() - t1,
    ...(signInErr ? { error: signInErr.message, status: signInErr.status, code: signInErr.code } : {}),
    sessionUserMatches: signIn?.user?.id === created.user.id,
  });

  // 5. Kontrol negatif
  const { error: wrongErr } = await anon().auth.signInWithPassword({
    email,
    password: env.SPIKE_TEST_PASSWORD + "-salah",
  });
  step("supabase.signIn.wrongPasswordRejected", Boolean(wrongErr), {
    ...(wrongErr ? { code: wrongErr.code, status: wrongErr.status } : { error: "password salah DITERIMA" }),
  });

  // 6. Login kedua (setelah login pertama GoTrue bisa me-rehash ke bcrypt) — harus tetap jalan
  const { error: secondErr } = await anon().auth.signInWithPassword({ email, password: env.SPIKE_TEST_PASSWORD });
  step("supabase.signIn.secondTime", !secondErr, secondErr ? { error: secondErr.message } : {});

  // 7. Cleanup
  if (!KEEP) {
    const { error } = await admin.auth.admin.deleteUser(created.user.id);
    step("supabase.cleanup", !error, error ? { error: error.message } : {});
  }

  result.verdict = loginOk && Boolean(wrongErr) && !secondErr ? "BERHASIL" : "GAGAL";
} catch (err) {
  result.verdict = "GAGAL";
  result.error = String(err?.message || err).slice(0, 300);
}

result.finishedAt = nowIso();
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.verdict === "BERHASIL" ? 0 : 1;
