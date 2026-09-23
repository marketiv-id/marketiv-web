import { z } from "zod";
import {
  requiredStringMax,
  optionalString,
  enumOf,
  requiredHttpsUrl,
  indonesianPhone,
} from "./common";

/**
 * Skema update profil UMKM & Kreator + portofolio.
 * Field yang tidak punya kolom di appwrite.config.json (instagram/website UMKM,
 * bannerUrl/portfolioUrl kreator) TIDAK ada di skema ini — sengaja dihapus dari
 * UI, lihat handoff Sprint 3.
 */

// niche enum harus sinkron dengan creator_profiles.niche & CreatorNiche.
export const CREATOR_NICHES = [
  "kuliner",
  "fashion",
  "pariwisata",
  "edukasi",
  "kecantikan",
  "lainnya",
] as const;

export const umkmProfileUpdateSchema = z.object({
  businessName: requiredStringMax("Nama bisnis", 255),
  category: requiredStringMax("Kategori", 100),
  description: requiredStringMax("Deskripsi", 2000).min(
    20,
    "Deskripsi minimal 20 karakter."
  ),
  city: requiredStringMax("Kota", 100),
  address: optionalString(500, "Alamat"),
  tiktok: optionalString(255, "TikTok"),
  phone: indonesianPhone,
});
export type UmkmProfileUpdateInput = z.infer<typeof umkmProfileUpdateSchema>;

export const creatorProfileUpdateSchema = z.object({
  displayName: requiredStringMax("Nama display", 255),
  niche: enumOf(CREATOR_NICHES, "Niche"),
  city: requiredStringMax("Kota", 100),
  bio: requiredStringMax("Bio", 2000).min(20, "Bio minimal 20 karakter."),
});
export type CreatorProfileUpdateInput = z.infer<typeof creatorProfileUpdateSchema>;

/**
 * Skema onboarding — aturan completion sama dengan `creatorProfileUpdateSchema`
 * (displayName, niche, city, bio ≥ 20). Keduanya harus lolos evaluasi
 * server-side Function `update-profile`; client tidak menulis
 * `isProfileCompleted`.
 */
export const creatorOnboardingSchema = z.object({
  displayName: requiredStringMax("Nama display", 255),
  niche: enumOf(CREATOR_NICHES, "Niche"),
  city: requiredStringMax("Kota", 100),
  bio: requiredStringMax("Bio", 2000).min(20, "Bio minimal 20 karakter."),
});
export type CreatorOnboardingInput = z.infer<typeof creatorOnboardingSchema>;

export const umkmOnboardingSchema = z.object({
  businessName: requiredStringMax("Nama bisnis", 255),
  category: requiredStringMax("Kategori", 100),
  city: requiredStringMax("Kota", 100),
  description: requiredStringMax("Deskripsi usaha", 2000).min(
    20,
    "Deskripsi usaha minimal 20 karakter."
  ),
  // Wajib & tervalidasi ketat di sini karena inilah satu-satunya wizard yang
  // mengumpulkannya sejak /auth/oauth-complete dihapus. Nomor mendarat di
  // users.phone lewat prefs → create-user-profile, bukan di umkm_profiles.
  phone: indonesianPhone,
  address: optionalString(500, "Alamat"),
  tiktok: optionalString(255, "TikTok"),
});
export type UmkmOnboardingInput = z.infer<typeof umkmOnboardingSchema>;

export const creatorPortfolioSchema = z.object({
  title: requiredStringMax("Judul portofolio", 255),
  portfolioUrl: requiredHttpsUrl("Link portofolio"),
  description: optionalString(2000, "Deskripsi"),
  thumbnailUrl: optionalString(2048, "Thumbnail"),
});
export type CreatorPortfolioInput = z.infer<typeof creatorPortfolioSchema>;

export const socialHandleSchema = z.object({
  platform: enumOf(["tiktok"] as const, "Platform"),
  username: requiredStringMax("Username", 255),
});
export type SocialHandleInput = z.infer<typeof socialHandleSchema>;

/**
 * Ambil handle dari URL/teks TikTok. Menerima juga handle telanjang.
 * tiktok.com/@handle -> handle.
 */
export function extractSocialUsername(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  const match = raw.match(/tiktok\.com\/@?([A-Za-z0-9._]+)/i);
  if (match) return match[1];
  return raw.replace(/^@/, "");
}
