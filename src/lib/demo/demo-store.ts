import { Campaign, UmkmSettingsProfile } from "@/types/umkm-dashboard.types";
import {
  CreatorJob,
  CreatorActiveWork,
  CreatorNegotiation,
  CreatorProfile,
  CreatorTransaction,
} from "@/types/creator-dashboard";
import { ChatMessage } from "@/types/umkm-dashboard.types";
import { MOCK_ASSETS } from "@/constants/mock-assets.constants";

export interface DemoStoreState {
  version: number;
  lastResetAt: string;
  activeRole: "umkm" | "creator" | "admin";
  campaigns: Campaign[];
  creatorJobs: CreatorJob[];
  creatorActiveWorks: CreatorActiveWork[];
  negotiations: CreatorNegotiation[];
  chatMessages: Record<string, ChatMessage[]>;
  transactions: CreatorTransaction[];
  umkmProfile: UmkmSettingsProfile;
  creatorProfile: CreatorProfile;
}

const STORAGE_KEY = "marketiv_demo_store_v1";

/**
 * Data showcase pameran autentik UMKM & Kreator Indonesia.
 * Menghindari data kosong atau teks acak selama demo booth pameran.
 */
export function createInitialDemoState(): DemoStoreState {
  const initialCampaigns: Campaign[] = [
    {
      id: "demo_cmp_001",
      umkmId: "umkm_001",
      title: "Review Jujur Sambal Roa Pedas Gurih",
      brief:
        "Buat video review berdurasi 30-60 detik yang menampilkan reaksi saat mencoba Sambal Roa Juara Manado. Tekankan ikan roa asap melimpah, rasa pedas gurih khas Manado, dan cocok dipadukan nasi hangat.",
      externalAssetUrl: "https://drive.google.com/drive/folders/sambal-roa-juara-assets",
      thumbnailUrl: MOCK_ASSETS.campaigns.sambalMatah,
      niche: "kuliner",
      status: "active",
      creatorQuota: 3,
      usedQuota: 1,
      pricePerThousandViews: 15000,
      totalBudgetEscrow: 1500000,
      remainingBudget: 1000000,
      usedBudget: 500000,
      totalViews: 32400,
      createdAt: "2026-09-20T08:00:00.000Z",
      updatedAt: "2026-09-22T10:00:00.000Z",
    },
    {
      id: "demo_cmp_002",
      umkmId: "umkm_001",
      title: "Koleksi Kemeja Batik Pewarna Alami Solo",
      brief:
        "Tampilkan keanggunan motif batik tulis sekar kencana dalam outfit kasual harian. Sorot detail canting tangan dan kenyamanan bahan katun primisima saat dipakai beraktivitas.",
      externalAssetUrl: "https://drive.google.com/drive/folders/batik-sekar-kencana-assets",
      thumbnailUrl: MOCK_ASSETS.campaigns.fashionBatik,
      niche: "fashion",
      status: "active",
      creatorQuota: 2,
      usedQuota: 0,
      pricePerThousandViews: 20000,
      totalBudgetEscrow: 1000000,
      remainingBudget: 1000000,
      usedBudget: 0,
      totalViews: 0,
      createdAt: "2026-09-21T09:30:00.000Z",
      updatedAt: "2026-09-21T09:30:00.000Z",
    },
    {
      id: "demo_cmp_003",
      umkmId: "umkm_001",
      title: "Manual Brew Guide Kopi Robusta Ijen",
      brief:
        "Edukasi cara seduh kopi tubruk atau V60 dengan aroma cokelat nutty khas lereng Gunung Ijen. Ajak pecinta kopi beralih ke biji kopi lokal kualitas ekspor.",
      externalAssetUrl: "https://drive.google.com/drive/folders/kopi-robusta-ijen-assets",
      thumbnailUrl: MOCK_ASSETS.campaigns.kopiAren,
      niche: "kuliner",
      status: "active",
      creatorQuota: 5,
      usedQuota: 2,
      pricePerThousandViews: 12000,
      totalBudgetEscrow: 1800000,
      remainingBudget: 1080000,
      usedBudget: 720000,
      totalViews: 60000,
      createdAt: "2026-09-18T14:00:00.000Z",
      updatedAt: "2026-09-23T11:00:00.000Z",
    },
    {
      id: "demo_cmp_004",
      umkmId: "umkm_001",
      title: "Camilan Keripik Pisang Lumer Cokelat",
      brief:
        "Tampilkan momen renyah saat mengunyah keripik pisang dengan lumuran saus cokelat Belgia pekat. Cocok untuk teman lembur atau ngopi santai.",
      externalAssetUrl: "https://drive.google.com/drive/folders/keripik-lumer-assets",
      thumbnailUrl: MOCK_ASSETS.campaigns.keripikSingkong,
      niche: "kuliner",
      status: "completed",
      creatorQuota: 4,
      usedQuota: 4,
      pricePerThousandViews: 10000,
      totalBudgetEscrow: 1200000,
      remainingBudget: 0,
      usedBudget: 1200000,
      totalViews: 120000,
      createdAt: "2026-09-10T10:00:00.000Z",
      updatedAt: "2026-09-19T16:00:00.000Z",
    },
  ];

  const initialJobs: CreatorJob[] = initialCampaigns.map((c) => ({
    id: c.id,
    title: c.title,
    brandName:
      c.niche === "fashion"
        ? "Batik Tulis Sekar Kencana"
        : c.title.includes("Kopi")
        ? "Kopi Robusta Lereng Ijen"
        : "Sambal Roa Juara Manado",
    brandAvatar:
      c.niche === "fashion"
        ? MOCK_ASSETS.campaigns.fashionBatik
        : c.title.includes("Kopi")
        ? MOCK_ASSETS.campaigns.kopiAren
        : MOCK_ASSETS.umkm.dapurSehat,
    brief: c.brief,
    niche: c.niche,
    quota: c.creatorQuota,
    usedQuota: c.usedQuota,
    ratePerThousandViews: c.pricePerThousandViews,
    status: c.status,
    totalBudget: c.totalBudgetEscrow,
    createdAt: c.createdAt,
    targetViews: Math.round(c.totalBudgetEscrow / (c.pricePerThousandViews / 1000)),
    thumbnailUrl: c.thumbnailUrl,
    externalAssetUrl: c.externalAssetUrl,
  }));

  const initialActiveWorks: CreatorActiveWork[] = [
    {
      id: "demo_claim_001",
      campaignId: "demo_cmp_001",
      title: "Review Jujur Sambal Roa Pedas Gurih",
      brandName: "Sambal Roa Juara Manado",
      brandAvatar: MOCK_ASSETS.umkm.dapurSehat,
      brief:
        "Buat video review berdurasi 30-60 detik yang menampilkan reaksi saat mencoba Sambal Roa Juara Manado. Siap dikirimkan tautan bukti tayang postingan TikTok.",
      ratePerThousandViews: 15000,
      status: "claimed",
      claimedAt: "2026-09-23T09:00:00.000Z",
      deadline: "2026-09-30T23:59:59.000Z",
      thumbnailUrl: MOCK_ASSETS.campaigns.sambalMatah,
      assetUrl: "https://drive.google.com/drive/folders/sambal-roa-juara-assets",
    },
    {
      id: "demo_claim_002",
      campaignId: "demo_cmp_003",
      title: "Manual Brew Guide Kopi Robusta Ijen",
      brandName: "Kopi Robusta Lereng Ijen",
      brandAvatar: MOCK_ASSETS.campaigns.kopiAren,
      brief: "Edukasi cara seduh kopi tubruk atau V60 dengan aroma cokelat nutty khas lereng Gunung Ijen.",
      ratePerThousandViews: 12000,
      status: "submitted",
      claimedAt: "2026-09-21T10:00:00.000Z",
      deadline: "2026-09-28T23:59:59.000Z",
      submittedAt: "2026-09-23T15:30:00.000Z",
      submissionId: "demo_sub_001",
      submissionStatus: "pending",
      contentUrl: "https://www.tiktok.com/@riankulineran/video/73918291028",
      thumbnailUrl: MOCK_ASSETS.campaigns.kopiAren,
    },
  ];

  const initialNegotiations: CreatorNegotiation[] = [
    {
      id: "demo_conv_001",
      conversationId: "demo_conv_001",
      orderId: "demo_ord_001",
      stage: "pending_payment",
      umkmId: "umkm_001",
      umkmName: "Sambal Roa Juara Manado",
      umkmAvatarUrl: MOCK_ASSETS.umkm.dapurSehat,
      projectTitle: "Paket Video TikTok Promosi Sambal Roa",
      scope: "1 video review TikTok durasi 45-60 detik, sound viral, pinning komentar link pembelian.",
      deadline: "2026-10-05T23:59:59.000Z",
      finalPrice: 450000,
      platformFee: 9000,
      totalAmount: 441000,
      lastMessage: "Penawaran Khusus: Paket Video TikTok Promosi Sambal Roa",
      lastMessageAt: "2026-09-24T10:00:00.000Z",
      unreadCount: 0,
      isArchived: false,
    },
  ];

  const initialChatMessages: Record<string, ChatMessage[]> = {
    demo_conv_001: [
      {
        id: "msg_001",
        conversationId: "demo_conv_001",
        senderId: "umkm_001",
        senderRole: "umkm",
        type: "text",
        content: "Halo kak Rian! Kami dari Sambal Roa Juara Manado, tertarik kerja sama review konten TikTok ya.",
        isRead: true,
        createdAt: "2026-09-24T09:45:00.000Z",
      },
      {
        id: "msg_002",
        conversationId: "demo_conv_001",
        senderId: "creator_002",
        senderRole: "creator",
        type: "text",
        content: "Halo kak! Boleh banget, audiens saya suka review sambal dan makanan pedas. Mau paket apa kak?",
        isRead: true,
        createdAt: "2026-09-24T09:48:00.000Z",
      },
      {
        id: "msg_003",
        conversationId: "demo_conv_001",
        senderId: "umkm_001",
        senderRole: "umkm",
        type: "offer",
        content: "Penawaran Khusus: Paket Video TikTok Promosi Sambal Roa",
        offerData: {
          offerId: "demo_off_001",
          title: "Paket Video TikTok Promosi Sambal Roa",
          finalPrice: 450000,
          scope: "1 video review TikTok durasi 45-60 detik, sound viral, pinning komentar link pembelian.",
          deadline: "2026-10-05T23:59:59.000Z",
          revisionCount: 2,
        },
        isRead: true,
        createdAt: "2026-09-24T10:00:00.000Z",
      },
    ],
  };

  const initialTransactions: CreatorTransaction[] = [
    {
      id: "demo_trx_001",
      amount: 450000,
      type: "deposit",
      status: "held",
      createdAt: "2026-09-24T10:05:00.000Z",
      description: "Escrow Deposit - Paket Video TikTok Sambal Roa",
    },
    {
      id: "demo_trx_002",
      amount: 600000,
      type: "release",
      status: "completed",
      createdAt: "2026-09-22T14:30:00.000Z",
      description: "Pencairan Saldo Campaign Kopi Ijen",
    },
  ];

  return {
    version: 1,
    lastResetAt: new Date().toISOString(),
    activeRole: "umkm",
    campaigns: initialCampaigns,
    creatorJobs: initialJobs,
    creatorActiveWorks: initialActiveWorks,
    negotiations: initialNegotiations,
    chatMessages: initialChatMessages,
    transactions: initialTransactions,
    umkmProfile: {
      docId: "umkm_prof_001",
      userId: "umkm_001",
      businessName: "Sambal Roa Juara Manado",
      category: "Kuliner",
      description: "Produksi sambal roa autentik khas Manado dengan ikan roa asap premium.",
      city: "Manado",
      address: "Jl. Sam Ratulangi No. 45, Manado",
      tiktok: "@sambalroajuara",
      logoUrl: MOCK_ASSETS.umkm.dapurSehat,
      isProfileCompleted: true,
    },
    creatorProfile: {
      id: "creator_002",
      name: "Rian Pratama",
      username: "riankulineran",
      avatarUrl: MOCK_ASSETS.creators[2],
      niche: "kuliner",
      bio: "Food & Street Food Explorer | 48K Followers di TikTok | Suka pedas & kuliner nusantara",
      location: "Jakarta & Sekitarnya",
      followers: 48500,
      startingPrice: 350000,
      rating: 4.9,
      completedJobs: 24,
      engagementRate: 8.2,
      tiktokUrl: "https://tiktok.com/@riankulineran",
      instagramUrl: "https://instagram.com/riankulineran",
      isVerified: true,
      isOnboarded: true,
      averageViews: 25400,
      completionRate: 98,
    },
  };
}

/**
 * Membaca state demo dari localStorage.
 * Jika kosong atau belum ada, inisialisasi dengan seed pameran default.
 */
export function getDemoStore(): DemoStoreState {
  if (typeof window === "undefined") {
    return createInitialDemoState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialDemoState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as DemoStoreState;
  } catch (err) {
    console.warn("Gagal membaca demo store dari localStorage, fallback ke seed:", err);
    return createInitialDemoState();
  }
}

/**
 * Menyimpan seluruh state demo ke localStorage.
 */
export function saveDemoStore(state: DemoStoreState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Gagal menyimpan demo store:", err);
  }
}

/**
 * Reset seluruh data demo ke kondisi awal pameran.
 */
export function resetDemoStore(): DemoStoreState {
  const fresh = createInitialDemoState();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      window.localStorage.removeItem("marketiv.mock.role");
    } catch (err) {
      console.error("Gagal reset demo store:", err);
    }
  }
  return fresh;
}

// ── Mutator Functions ─────────────────────────────────────────────────────────

export function addDemoCampaign(campaign: Campaign): Campaign {
  const store = getDemoStore();
  const exists = store.campaigns.some((c) => c.id === campaign.id);
  const updatedCampaigns = exists
    ? store.campaigns.map((c) => (c.id === campaign.id ? campaign : c))
    : [campaign, ...store.campaigns];

  // Mirror ke Job Pool bila status aktif
  const existingJob = store.creatorJobs.find((j) => j.id === campaign.id);
  const updatedJob: CreatorJob = {
    id: campaign.id,
    title: campaign.title,
    brandName: store.umkmProfile.businessName,
    brandAvatar: store.umkmProfile.logoUrl,
    brief: campaign.brief,
    niche: campaign.niche,
    quota: campaign.creatorQuota,
    usedQuota: campaign.usedQuota,
    ratePerThousandViews: campaign.pricePerThousandViews,
    status: campaign.status,
    totalBudget: campaign.totalBudgetEscrow,
    createdAt: campaign.createdAt,
    targetViews: Math.round(campaign.totalBudgetEscrow / (campaign.pricePerThousandViews / 1000)),
    thumbnailUrl: campaign.thumbnailUrl || MOCK_ASSETS.campaigns.sambalMatah,
    externalAssetUrl: campaign.externalAssetUrl,
  };

  const updatedJobs = existingJob
    ? store.creatorJobs.map((j) => (j.id === campaign.id ? updatedJob : j))
    : [updatedJob, ...store.creatorJobs];

  store.campaigns = updatedCampaigns;
  store.creatorJobs = updatedJobs;
  saveDemoStore(store);
  return campaign;
}

export function updateDemoCampaignStatus(campaignId: string, status: Campaign["status"]): boolean {
  const store = getDemoStore();
  const c = store.campaigns.find((item) => item.id === campaignId);
  if (!c) return false;

  c.status = status;
  c.updatedAt = new Date().toISOString();
  if (status === "active" && c.remainingBudget <= 0) {
    c.remainingBudget = c.totalBudgetEscrow;
  }

  const j = store.creatorJobs.find((item) => item.id === campaignId);
  if (j) j.status = status;

  saveDemoStore(store);
  return true;
}

export function deleteDemoCampaign(campaignId: string): boolean {
  const store = getDemoStore();
  const exists = store.campaigns.some((c) => c.id === campaignId);
  if (!exists) return false;

  store.campaigns = store.campaigns.filter((c) => c.id !== campaignId);
  store.creatorJobs = store.creatorJobs.filter((j) => j.id !== campaignId);
  saveDemoStore(store);
  return true;
}

export function claimDemoJob(campaignId: string): { success: boolean; claimId?: string; error?: string } {
  const store = getDemoStore();
  const job = store.creatorJobs.find((j) => j.id === campaignId);
  if (!job) return { success: false, error: "Campaign tidak ditemukan." };

  if (job.usedQuota >= job.quota) {
    return { success: false, error: "Kuota kreator untuk campaign ini sudah penuh." };
  }

  job.usedQuota += 1;
  const campaign = store.campaigns.find((c) => c.id === campaignId);
  if (campaign) campaign.usedQuota += 1;

  const claimId = `demo_claim_${Date.now()}`;
  const newActiveWork: CreatorActiveWork = {
    id: claimId,
    campaignId: job.id,
    title: job.title,
    brandName: job.brandName,
    brandAvatar: job.brandAvatar,
    brief: job.brief,
    ratePerThousandViews: job.ratePerThousandViews,
    status: "claimed",
    claimedAt: new Date().toISOString(),
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    thumbnailUrl: job.thumbnailUrl,
    assetUrl: job.externalAssetUrl,
  };

  store.creatorActiveWorks = [newActiveWork, ...store.creatorActiveWorks];
  saveDemoStore(store);
  return { success: true, claimId };
}

export function submitDemoProof(claimId: string, proofUrl: string): { success: boolean; error?: string } {
  const store = getDemoStore();
  const work = store.creatorActiveWorks.find((w) => w.id === claimId);
  if (!work) return { success: false, error: "Pekerjaan tidak ditemukan." };

  work.status = "submitted";
  work.contentUrl = proofUrl;
  work.submittedAt = new Date().toISOString();
  work.submissionStatus = "pending";

  saveDemoStore(store);
  return { success: true };
}

export function unclaimDemoJob(claimId: string): { success: boolean; error?: string } {
  const store = getDemoStore();
  const work = store.creatorActiveWorks.find((w) => w.id === claimId);
  if (!work) return { success: false, error: "Pekerjaan tidak ditemukan." };

  const job = store.creatorJobs.find((j) => j.id === work.campaignId);
  if (job && job.usedQuota > 0) job.usedQuota -= 1;

  const campaign = store.campaigns.find((c) => c.id === work.campaignId);
  if (campaign && campaign.usedQuota > 0) campaign.usedQuota -= 1;

  store.creatorActiveWorks = store.creatorActiveWorks.filter((w) => w.id !== claimId);
  saveDemoStore(store);
  return { success: true };
}
