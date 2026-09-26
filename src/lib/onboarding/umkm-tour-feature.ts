/**
 * Kill switch untuk UMKM onboarding tour (Driver.js, T02–T05): dashboard tour,
 * campaign handoff, dan replay dari halaman Panduan.
 *
 * Fitur belum selesai, jadi default-nya mati. Set
 * `NEXT_PUBLIC_UMKM_ONBOARDING_TOUR_ENABLED=true` kalau tour siap dipakai.
 * Test suite onboarding menyalakan flag ini di `vitest.config.mts` supaya engine
 * Driver.js tetap teruji.
 */
export const UMKM_ONBOARDING_TOUR_ENABLED =
  process.env.NEXT_PUBLIC_UMKM_ONBOARDING_TOUR_ENABLED === "true";
