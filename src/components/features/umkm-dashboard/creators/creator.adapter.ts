import type { Creator } from "@/types/campaign";
import type {
  CreatorProfile,
  CreatorNiche,
  CreatorSocialAccount,
  RateCardPackage,
} from "@/types/umkm-dashboard.types";
import type { RateCardPackage as RateCardPackageView } from "./detail/RateCardPackageCard";
import { formatFollowersLabel, formatCurrency } from "@/lib/formatters";

/**
 * Adapter kanon → view-model kartu kreator (s1-creators).
 *
 * `Creator` (@/types/campaign) adalah view-model lama yang dikonsumsi
 * CreatorCard & CreatorProfileHero. Sumber datanya kini `CreatorProfile`
 * dari service (getCreators/getCreatorById), bukan lagi src/data/creators.ts.
 *
 * Tiga field tidak punya padanan langsung di kanon — semuanya gagal-tertutup,
 * tidak ada nilai karangan:
 * - `followers` → `CreatorProfile.followers` (agregat dari Function DTO) atau
 *   `creator_social_accounts` di halaman detail; tanpa keduanya "—".
 * - `estimatedSalary` → "Belum ada paket harga" saat startingPrice 0 (kreator
 *   belum punya paket harga published).
 * - `totalReviews` → memakai `completedJobs` sebagai proxy (satu pekerjaan
 *   selesai ≈ satu ulasan) sampai DTO ulasan tersedia.
 */

/** Label kategori tampilan per niche kanon. */
const NICHE_LABEL: Record<CreatorNiche, string> = {
  kuliner: "Kuliner",
  fashion: "Fashion",
  pariwisata: "Pariwisata",
  edukasi: "Edukasi",
  kecantikan: "Kecantikan",
  lainnya: "Lainnya",
};

/**
 * Paket rate card kanon → view-model kartu paket.
 *
 * Kanon tidak membawa `revisionLimit`, `recommended`, maupun daftar deliverable
 * jamak (hanya satu string `deliverable`). Nilai default di bawah dipakai
 * sampai tipe kanon/DTO diperluas — bukan data fabrikasi per kategori seperti
 * generator lama.
 */
export function toRateCardPackageView(pkg: RateCardPackage): RateCardPackageView {
  return {
    id: pkg.id,
    name: pkg.name,
    price: formatCurrency(pkg.price),
    description: pkg.description,
    deliveryDays: pkg.estimatedDays,
    revisionLimit: pkg.revisionLimit ?? null,
    deliverables: pkg.deliverable ? [pkg.deliverable] : [],
  };
}

export function toCreatorView(profile: CreatorProfile): Creator {
  return {
    id: profile.id,
    name: profile.name,
    username: profile.username || profile.name.toLowerCase().replace(/\s+/g, ""),
    description: profile.bio || "Belum menuliskan deskripsi profil.",
    category: NICHE_LABEL[profile.niche] ?? "Lainnya",
    imageUrl: profile.avatarUrl,
    bannerUrl: profile.bannerUrl,
    estimatedSalary: profile.startingPrice > 0 ? formatCurrency(profile.startingPrice) : "Belum ada paket harga",
    followers: formatFollowersLabel(profile.followers ?? 0),
    rating: profile.rating,
    totalReviews: profile.completedJobs,
    isVerified: profile.isVerified,
    location: profile.location,
    engagementRate: profile.engagementRate,
    completedJobs: profile.completedJobs,
    instagramUrl: profile.instagramUrl,
    tiktokUrl: profile.tiktokUrl,
  };
}

/**
 * Label followers untuk hero. Sumber pertama: jumlah akun sosial nyata
 * (`creator_social_accounts`) — paling segar dan bisa dibaca klien.
 * `fallbackFollowers` dipakai kalau akun sosial belum terbaca/tidak ada:
 * agregat dari Function DTO (`CreatorProfile.followers`).
 * Angka 0 berarti belum pernah diisi → "—", bukan 0 dan bukan angka karangan.
 */
export function toFollowersLabel(
  accounts: CreatorSocialAccount[],
  fallbackFollowers = 0
): string {
  const total = accounts.reduce(
    (sum, account) => sum + (account.followers > 0 ? account.followers : 0),
    0
  );
  if (total > 0) return formatFollowersLabel(total);
  return formatFollowersLabel(fallbackFollowers);
}
