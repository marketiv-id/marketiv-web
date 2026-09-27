import type { CreatorPortfolioItem, CreatorSocialAccount } from "@/types/umkm-dashboard.types";
import { MOCK_ASSETS } from "@/constants/mock-assets.constants";

/**
 * Portofolio & akun sosial per `creatorId` untuk mode mock.
 *
 * Hanya sebagian `mockCreators` yang punya isi: `creatorId` yang tidak ada di
 * peta ini memang belum punya portofolio/akun sosial, jadi halaman menampilkan
 * empty state — bukan item karangan. Jangan mengganti dengan generator
 * aritmetika per id seperti `CreatorStatsCards` versi lama.
 */
export const mockCreatorPortfolios: Record<string, CreatorPortfolioItem[]> = {
  creator_001: [
    {
      id: "port_creator_001_1",
      title: "Review Sambal Matah Khas Bali",
      url: "https://www.tiktok.com/@ahmadfauzi/video/7410000000000000001",
      description: "Review pedas segar sambal matah asli Bali, ditonton ratusan ribu penonton.",
      thumbnailUrl: MOCK_ASSETS.campaigns.sambalMatah,
    },
    {
      id: "port_creator_001_2",
      title: "Kuliner Hidden Gem Bandung",
      url: "https://www.instagram.com/reel/ahmadfauzi-bandung-hidden-gem",
      description: "Jelajah warung kaki lima legendaris di Bandung bersama komunitas lokal.",
      thumbnailUrl: MOCK_ASSETS.campaigns.nasiSehat,
    },
  ],
  creator_002: [
    {
      id: "port_creator_002_1",
      title: "Resep Brownies Ubi Lembut",
      url: "https://www.tiktok.com/@sitirahma/video/7410000000000000002",
      description: "Resep rumahan simpel untuk jajanan kekinian yang ramah kantong.",
      thumbnailUrl: MOCK_ASSETS.campaigns.browniesUbi,
    },
  ],
};

export const mockCreatorSocialAccounts: Record<string, CreatorSocialAccount[]> = {
  creator_001: [
    {
      id: "soc_creator_001_tiktok",
      platform: "tiktok",
      username: "ahmadfauzi",
      followers: 15400,
      engagementRate: 5.4,
    },
    {
      id: "soc_creator_001_instagram",
      platform: "instagram",
      username: "ahmadfauzi",
      followers: 9800,
      engagementRate: 4.1,
    },
  ],
  creator_002: [
    {
      id: "soc_creator_002_tiktok",
      platform: "tiktok",
      username: "sitirahma",
      followers: 22000,
      engagementRate: 6.2,
    },
  ],
};
