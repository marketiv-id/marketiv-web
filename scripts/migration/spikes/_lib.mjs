/**
 * Helper bersama untuk skrip spike & audit Fase 0.
 *
 * Aturan:
 * - Kredensial HANYA dari env. Tidak ada fallback ke ~/.appwrite/prefs.json.
 * - Akses Appwrite read-only: helper ini hanya mengizinkan GET.
 * - Jangan pernah mencetak secret, hash password, email, nama, atau nomor rekening.
 */

/** Ambil env wajib; lempar error yang menyebut nama env (bukan nilainya). */
export function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    throw new Error(`Env wajib belum diset: ${missing.join(", ")}`);
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]]));
}

/**
 * Buat client Appwrite read-only.
 * @param {"prod"|"staging"} target
 *   prod    → APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY / APPWRITE_DATABASE_ID
 *   staging → APPWRITE_STAGING_ENDPOINT / APPWRITE_STAGING_PROJECT_ID / APPWRITE_STAGING_API_KEY
 */
export function appwriteClient(target) {
  const p = target === "staging" ? "APPWRITE_STAGING_" : "APPWRITE_";
  const env = requireEnv(`${p}ENDPOINT`, `${p}PROJECT_ID`, `${p}API_KEY`);
  const endpoint = env[`${p}ENDPOINT`].replace(/\/+$/, "");
  const project = env[`${p}PROJECT_ID`];
  const key = env[`${p}API_KEY`];
  const databaseId =
    target === "staging"
      ? process.env.APPWRITE_STAGING_DATABASE_ID || null
      : process.env.APPWRITE_DATABASE_ID || null;

  async function get(pathname, queries = []) {
    let url = endpoint + pathname;
    if (queries.length) {
      const qs = queries.map((q) => "queries[]=" + encodeURIComponent(JSON.stringify(q))).join("&");
      url += (url.includes("?") ? "&" : "?") + qs;
    }
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(url, {
        method: "GET",
        headers: { "X-Appwrite-Project": project, "X-Appwrite-Key": key },
      });
      const text = await res.text();
      if (res.ok) return JSON.parse(text);
      lastErr = new Error(`${res.status} GET ${pathname} :: ${text.slice(0, 300)}`);
      if (res.status < 500 && res.status !== 429) break;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
    throw lastErr;
  }

  /** Paginasi cursor (stabil untuk tabel besar). `key` = nama array di respons. */
  async function listAll(pathname, key, { queries = [], pageSize = 100 } = {}) {
    const out = [];
    let cursor = null;
    for (;;) {
      const qs = [...queries, { method: "limit", values: [pageSize] }];
      if (cursor) qs.push({ method: "cursorAfter", values: [cursor] });
      const res = await get(pathname, qs);
      const items = res[key] || [];
      out.push(...items);
      if (items.length < pageSize) break;
      cursor = items[items.length - 1].$id;
    }
    return out;
  }

  return { target, endpoint, project, databaseId, get, listAll };
}

/** Samarkan string rahasia: hanya tampilkan panjang. */
export const masked = (s) => (s == null ? null : `<${String(s).length} chars>`);

/**
 * Struktur PHC string tanpa salt & digest.
 * "$argon2id$v=19$m=65536,t=4,p=3$<salt>$<hash>" → "$argon2id$v=19$m=65536,t=4,p=3$<salt>$<hash>"
 */
export function phcShape(hash) {
  if (typeof hash !== "string") return null;
  const parts = hash.split("$");
  if (parts.length < 4 || parts[0] !== "") return `non-PHC (${hash.length} chars)`;
  // ["", alg, v=.., params, salt, digest]
  const alg = parts[1];
  const rest = parts.slice(2);
  const visible = rest.filter((p) => /^[a-z]=/.test(p));
  return `$${alg}$${visible.join("$")}$<salt>$<digest>`;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const nowIso = () => new Date().toISOString();
