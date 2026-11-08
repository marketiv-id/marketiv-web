/**
 * Env Supabase yang aman untuk browser (prefix NEXT_PUBLIC_).
 *
 * Next.js hanya meng-inline `process.env.NEXT_PUBLIC_*` bila ditulis literal,
 * jadi setiap nama ditulis lengkap (tanpa akses dinamis).
 * Validasi dilakukan saat client dibuat, bukan saat modul di-import, supaya
 * aplikasi yang masih memakai Appwrite tetap jalan walau env ini belum diisi.
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Env Supabase belum diset: ${missing.join(", ")}`);
  }
  return { url: url as string, anonKey: anonKey as string };
}
