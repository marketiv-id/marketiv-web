/**
 * Cache sesi di memori browser, diisi `AuthProvider` setiap kali sesi dibaca.
 *
 * `requireUserId()` dulu memanggil `getSession()` penuh (getUser ke Auth +
 * baris `users` + profil = 3 read) di SETIAP pemanggilan service. Service
 * cukup tahu userId untuk menyusun filter — otorisasi sebenarnya ada di RLS
 * dan Route Handler — jadi cukup ambil dari cache ini.
 *
 * Bukan batas keamanan: nilai basi (mis. logout di tab lain) hanya membuat
 * query RLS mengembalikan kosong / 401 dari route.
 */

let cachedUserId: string | null = null;

export function setCachedSessionUserId(userId: string | null): void {
  cachedUserId = userId;
}

export function getCachedSessionUserId(): string | null {
  return cachedUserId;
}
