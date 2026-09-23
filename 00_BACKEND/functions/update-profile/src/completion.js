/**
 * Canonical profile completion evaluation — server-side source of truth.
 *
 * Aturan diambil dari audit + skema onboarding (jangan diubah tanpa lapor):
 * - UMKM: businessName, category, city, description >= 20 char, phone
 *   (phone di users.phone, bukan umkm_profiles).
 * - Creator: displayName, niche, city, bio >= 20 char, TikTok username
 *   (TikTok di creator_social_accounts).
 * - TikTok UMKM opsional — tidak menentukan completion (30_Business_Rules).
 *
 * Flag hanya false→true. Profil yang sudah true tidak pernah turun walau
 * field diubah jadi kosong (keputusan product: never downgrade).
 */

const MIN_LONG_TEXT = 20;
const INDONESIAN_PHONE = /^(\+62|62|0)8[0-9]{8,11}$/;

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function longEnough(value) {
  return typeof value === "string" && value.trim().length >= MIN_LONG_TEXT;
}

function validPhone(value) {
  return typeof value === "string" && INDONESIAN_PHONE.test(value.trim());
}

/**
 * Field UMKM yang gagal rules completion, urut sesuai evaluateUmkmCompletion.
 * Dipakai log observability saat completed=false — hanya nama field, tanpa nilai.
 * @param {{ businessName?: unknown, category?: unknown, city?: unknown,
 *   description?: unknown, phone?: unknown }} fields
 * @returns {string[]}
 */
export function umkmFailedFields(fields) {
  const f = fields || {};
  const failed = [];
  if (!nonEmpty(f.businessName)) failed.push("businessName");
  if (!nonEmpty(f.category)) failed.push("category");
  if (!nonEmpty(f.city)) failed.push("city");
  if (!longEnough(f.description)) failed.push("description");
  if (!validPhone(f.phone)) failed.push("phone");
  return failed;
}

/**
 * @param {{ businessName?: unknown, category?: unknown, city?: unknown,
 *   description?: unknown, phone?: unknown }} fields
 * @returns {boolean}
 */
export function evaluateUmkmCompletion(fields) {
  return umkmFailedFields(fields).length === 0;
}

/**
 * @param {{ displayName?: unknown, niche?: unknown, city?: unknown,
 *   bio?: unknown, tiktokUsername?: unknown }} fields
 * @returns {boolean}
 */
export function evaluateCreatorCompletion(fields) {
  const f = fields || {};
  return (
    nonEmpty(f.displayName) &&
    nonEmpty(f.niche) &&
    nonEmpty(f.city) &&
    longEnough(f.bio) &&
    nonEmpty(f.tiktokUsername)
  );
}

/**
 * Transisi flag completion. Never downgrade: true tetap true.
 * @param {boolean | null | undefined} currentFlag
 * @param {boolean} evaluated
 * @returns {boolean}
 */
export function nextProfileCompleted(currentFlag, evaluated) {
  if (currentFlag === true) return true;
  return evaluated === true;
}
