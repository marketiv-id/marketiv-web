import type { Creator } from "@/types/campaign";
import type {
  CreatorProfile,
  CreatorNiche,
  CreatorSocialAccount,
  RateCardPackage,
} from "@/types/umkm-dashboard.types";
import type { RateCardPackage as RateCardPackageView } from "./detail/RateCardPackageCard";
import { formatCompactNumber, formatCurrency } from "@/lib/formatters";

/**
 * Adapter kanon → view-model kartu kreator (s1-creators).
 *
 * `Creator` (@/types/campaign) adalah view-model lama yang dikonsumsi
 * CreatorCard & CreatorProfileHero. Sumber datanya kini `CreatorProfile`
 * dari service (getCreators/getCreatorById), bukan lagi src/data/creators.ts.
 *
 * Tiga field tidak punya padanan langsung di kanon — semuanya gagal-tertutup,
 * tidak ada nilai karangan:
 * - `followers` → tidak ada di CreatorProfile. Halaman detail mengisinya dari
 *   `creator_social_accounts` lewat toFollowersLabel(); tanpa itu nilainya ""
 *   dan UI menampilkan "—".
 * - `estimatedSalary` → "Belum ada rate card" saat startingPrice 0 (kreator
 *   belum punya paket rate card published).
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
    estimatedSalary: profile.startingPrice > 0 ? formatCurrency(profile.startingPrice) : "Belum ada rate card",
    followers: "",
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
 * Label followers untuk hero, dijumlahkan dari akun sosial nyata kreator
 * (`creator_social_accounts`). Angka 0 berarti kreator belum mengisi datanya,
 * jadi hasilnya "—" — bukan 0 dan bukan angka karangan.
 */
export function toFollowersLabel(accounts: CreatorSocialAccount[]): string {
  const total = accounts.reduce(
    (sum, account) => sum + (account.followers > 0 ? account.followers : 0),
    0
  );
  return total > 0 ? formatCompactNumber(total) : "—";
}
