/**
 * Mock view-model Overview UMKM.
 *
 * Direlokasi dari src/data/umkmDashboard.ts (dihapus di s1-delete-data) ke
 * lapisan mock service (s1-overview). Konsumsi HANYA lewat facade
 * getOverview() di umkm-dashboard.service.ts — komponen tidak import file ini
 * langsung.
 *
 * Tipe `UmkmOverviewData` kini tinggal di src/types/umkm-dashboard.types.ts
 * (s5-overview-dto); file ini hanya menyediakan datanya. `campaigns` tidak ada
 * di sini — facade menyuntikkan mockCampaigns supaya satu daftar campaign saja
 * yang jadi sumber, baik mock ON maupun OFF.
 *
 * Label Bahasa Indonesia di sini adalah teks tampilan, bukan nilai status
 * kanon. Nilai status kanon ada di src/types/domain.ts.
 */

import type { Campaign, UmkmOverviewData } from "@/types/umkm-dashboard.types";

/**
 * Nilai demo untuk KPI yang tidak bisa diturunkan dari daftar campaign
 * (belanja, saldo escrow, tayangan valid, submission menunggu). Angka-angka ini
 * memang seed pameran, bukan hasil hitungan — jangan dianggap sinkron dengan
 * daftar mana pun.
 */
const MOCK_SEED_KPIS = {
  totalSpend: 4800000,
  escrowBalance: 3250000,
  viewsValid: 184200,
  pendingSubmissions: 2,
};

/**
 * KPI yang BISA diturunkan diturunkan dari daftar campaign yang sedang dipakai
 * layar, supaya kartu KPI dan daftar campaign tidak saling bertentangan.
 */
export function deriveOverviewKpis(campaigns: Campaign[]): UmkmOverviewData["kpis"] {
  return {
    ...MOCK_SEED_KPIS,
    campaignActive: campaigns.filter((c) => c.status === "active").length,
    campaignCompleted: campaigns.filter((c) => c.status === "completed").length,
    creatorJoined: campaigns.reduce((sum, c) => sum + (c.usedQuota ?? 0), 0),
  };
}

/** `campaigns` disuntikkan facade, jadi tidak ada di objek mock ini. */
export const mockUmkmOverview: Omit<UmkmOverviewData, "campaigns"> = {
  businessName: "Dapur Sehat Sukabumi",
  kpis: {
    campaignActive: 1,
    campaignCompleted: 3,
    totalSpend: MOCK_SEED_KPIS.totalSpend,
    escrowBalance: MOCK_SEED_KPIS.escrowBalance,
    creatorJoined: 8,
    viewsValid: MOCK_SEED_KPIS.viewsValid,
    pendingSubmissions: MOCK_SEED_KPIS.pendingSubmissions,
  },
  insights: [
    {
      id: "ins-1",
      text: "Kampanye Produk Makanan Anda mendapat 28% lebih banyak penonton minggu ini.",
      type: "purple",
    },
    {
      id: "ins-2",
      text: "Tambahkan kreator ke kampanye Anda agar promosi usaha makin luas.",
      type: "info",
    },
    {
      id: "ins-3",
      text: "Dana pemasaran Anda disimpan aman oleh sistem hingga video selesai disetujui.",
      type: "success",
    },
  ],
  activities: [
    {
      id: "act-1",
      title: "Submission baru dari Nadia Foodie",
      description: "Mengirimkan link posting TikTok untuk campaign 'Sambal Matah'",
      type: "submission",
      time: "2 jam lalu",
    },
    {
      id: "act-2",
      title: "Submission baru dari Chef Budi",
      description: "Mengirimkan link posting Instagram untuk campaign 'Paket Nasi Sehat'",
      type: "submission",
      time: "5 jam lalu",
    },
    {
      id: "act-3",
      title: "Pembayaran Escrow Berhasil",
      description: "Dana Rp 3.300.000 sukses diamankan ke sistem Escrow",
      type: "payment",
      time: "1 hari lalu",
    },
    {
      id: "act-4",
      title: "Campaign Baru Aktif",
      description: "Campaign 'Sambal Matah' resmi aktif dengan kuota 12 kreator",
      type: "campaign",
      time: "2 hari lalu",
    },
  ],
};
