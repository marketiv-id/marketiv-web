import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";
import { mockDelay } from "@/lib/mock-delay";
import { MINIMUM_CAMPAIGN_BUDGET } from "@/types/domain";
import {
  getDemoStore,
  addDemoCampaign,
  updateDemoCampaignStatus,
  deleteDemoCampaign,
} from "@/lib/demo/demo-store";
import {
  ServiceResult,
  UmkmProfile,
  UmkmDashboardSummary,
  Campaign,
  CampaignSubmission,
  CreatorProfile,
  PaginatedCreators,
  RateCardPackage,
  NegotiationOrder,
  ChatMessage,
  Transaction,
  UmkmFinanceSummary,
  EscrowOverview,
  UmkmSettingsProfile,
  UmkmOverviewData,
} from "@/types/umkm-dashboard.types";
import {
  mockUmkmProfile,
  mockUmkmSettingsProfile,
  mockSubmissions,
  mockCreators,
  mockRateCardPackages,
  mockNegotiations,
  mockChatMessages,
  mockTransactions,
  mockUmkmOverview,
  getCalculatedDashboardSummary,
} from "@/mocks/umkm";

import type { CreateOfferInput } from "@/lib/validations/offer.schema";
import {
  createConversationInAppwrite,
  sendMessageInAppwrite,
  getMessagesByConversationIdInAppwrite,
} from "@/services/shared/conversation-appwrite.service";
import {
  getUmkmProfileFromAppwrite,
  getOverviewFromAppwrite,
  getDashboardSummaryFromAppwrite,
  getCampaignsFromAppwrite,
  getCampaignByIdFromAppwrite,
  getCampaignSubmissionsFromAppwrite,
  getPendingSubmissionsFromAppwrite,
  getCreatorsFromAppwrite,
  getCreatorByIdFromAppwrite,
  getCreatorRateCardsFromAppwrite,
  getNegotiationsFromAppwrite,
  getNegotiationByIdFromAppwrite,
  createOfferInAppwrite,
  createOrderPaymentInAppwrite,
  getTransactionsFromAppwrite,
  getTransactionByIdFromAppwrite,
  getFinanceSummaryFromAppwrite,
  getEscrowOverviewFromAppwrite,
  getFinanceOverviewFromAppwrite,
  createCampaignDraftInAppwrite,
  getCampaignDraftForEditFromAppwrite,
  updateCampaignDraftInAppwrite,
  updateCampaignStatusInAppwrite,
  duplicateCampaignInAppwrite,
  getUmkmSettingsProfileFromAppwrite,
  updateUmkmProfileInAppwrite,
  uploadUmkmLogoInAppwrite,
  generateCampaignBriefFromAppwrite,
  createCampaignPaymentInAppwrite,
  deleteCampaignDraftInAppwrite,
  removeCampaignAssetInAppwrite,
  deleteOfferInAppwrite,
  cancelOrderInAppwrite,
  cancelPaymentInAppwrite,
  publishCampaignInAppwrite,
  reviewSubmissionInAppwrite,
  getSubmissionCountsFromAppwrite,
} from "./umkm-appwrite.service";
import type {
  UmkmFinanceOverview,
  AiBriefInput,
  AiBrief,
  PaymentIntent,
  CreateCampaignDraftInput,
  CampaignDraftResult,
  CampaignEditRaw,
  DuplicateCampaignOptions,
  UmkmProfileWriteInput,
  ReviewSubmissionInput,
} from "./umkm-appwrite.service";

export async function getUmkmProfile(): Promise<ServiceResult<UmkmProfile>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return { success: true, data: mockUmkmProfile };
  }
  return getUmkmProfileFromAppwrite();
}

/**
 * View-model halaman Overview (hero, KPI, daftar campaign, insights, activities).
 *
 * Mengembalikan `campaigns` sekalian supaya halaman cukup satu panggilan —
 * versi lama memanggil getOverview() + getCampaigns() berdampingan, dan cabang
 * Appwrite butuh daftar campaign itu juga untuk menghitung `creatorJoined`.
 */
export async function getOverview(): Promise<ServiceResult<UmkmOverviewData>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    const store = getDemoStore();
    return { success: true, data: { ...mockUmkmOverview, campaigns: store.campaigns } };
  }
  return getOverviewFromAppwrite();
}

export async function getDashboardSummary(): Promise<ServiceResult<UmkmDashboardSummary>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return { success: true, data: getCalculatedDashboardSummary() };
  }
  return getDashboardSummaryFromAppwrite();
}

export async function getCampaigns(): Promise<ServiceResult<Campaign[]>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return { success: true, data: getDemoStore().campaigns };
  }
  return getCampaignsFromAppwrite();
}

export async function getCampaignById(id: string): Promise<ServiceResult<Campaign>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    const campaign = getDemoStore().campaigns.find((c) => c.id === id);
    if (!campaign) {
      return { success: false, data: null, error: "Campaign tidak ditemukan", code: "not_found" };
    }
    return { success: true, data: campaign };
  }
  return getCampaignByIdFromAppwrite(id);
}

export async function getCampaignSubmissions(campaignId: string): Promise<ServiceResult<CampaignSubmission[]>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    const submissions = mockSubmissions.filter((s) => s.campaignId === campaignId);
    return { success: true, data: submissions };
  }
  return getCampaignSubmissionsFromAppwrite(campaignId);
}

/** UMKM-PERF-01: batch counts — replaces N+1 per-campaign pattern in CampaignsPage. */
export async function getSubmissionCounts(
  campaignIds: string[]
): Promise<ServiceResult<Record<string, { pending: number; valid: number; dispute: number }>>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(200);
    const counts: Record<string, { pending: number; valid: number; dispute: number }> = {};
    for (const id of campaignIds) {
      const subs = mockSubmissions.filter((s) => s.campaignId === id);
      counts[id] = {
        pending: subs.filter((s) => s.validationStatus === "pending").length,
        valid: subs.filter((s) => s.validationStatus === "approved").length,
        dispute: subs.filter((s) => s.fraudStatus !== "safe").length,
      };
    }
    return { success: true, data: counts };
  }
  return getSubmissionCountsFromAppwrite(campaignIds);
}

export async function getPendingSubmissions(): Promise<ServiceResult<CampaignSubmission[]>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    const submissions = mockSubmissions.filter((s) => s.validationStatus === "pending");
    return { success: true, data: submissions };
  }
  return getPendingSubmissionsFromAppwrite();
}

export async function getCreators(limit: number = 100, cursor?: string): Promise<ServiceResult<PaginatedCreators>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return { success: true, data: { items: mockCreators, total: mockCreators.length, nextCursor: null } };
  }
  return getCreatorsFromAppwrite(limit, cursor);
}

export async function getCreatorById(id: string): Promise<ServiceResult<CreatorProfile>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    const creator = mockCreators.find((c) => c.id === id);
    if (!creator) {
      return { success: false, data: null, error: "Kreator tidak ditemukan", code: "not_found" };
    }
    return { success: true, data: creator };
  }
  return getCreatorByIdFromAppwrite(id);
}

export async function getCreatorRateCards(creatorId: string): Promise<ServiceResult<RateCardPackage[]>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    const packages = mockRateCardPackages.filter((p) => p.creatorId === creatorId && p.status === "published");
    return { success: true, data: packages };
  }
  return getCreatorRateCardsFromAppwrite(creatorId);
}

export async function getNegotiations(): Promise<ServiceResult<NegotiationOrder[]>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return { success: true, data: mockNegotiations };
  }
  return getNegotiationsFromAppwrite();
}

export async function getNegotiationById(id: string): Promise<ServiceResult<NegotiationOrder>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    const order = mockNegotiations.find((n) => n.id === id);
    if (!order) {
      return { success: false, data: null, error: "Negosiasi tidak ditemukan", code: "not_found" };
    }
    return { success: true, data: order };
  }
  return getNegotiationByIdFromAppwrite(id);
}

/**
 * Pesan satu ruang negosiasi. Argumennya conversationId, bukan orderId —
 * `messages` memang di-key `conversation_id`, dan versi lama mengirim orderId
 * ke sana sehingga chat selalu kosong.
 */
export async function getMessagesByConversationId(
  conversationId: string
): Promise<ServiceResult<ChatMessage[]>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return { success: true, data: mockChatMessages[conversationId] || [] };
  }
  return getMessagesByConversationIdInAppwrite(conversationId);
}

/** Mulai (atau lanjutkan) percakapan dengan kreator. Mengembalikan conversationId. */
export async function createConversation(creatorId: string): Promise<ServiceResult<string>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(400);
    const existing = mockNegotiations.find((n) => n.creatorId === creatorId);
    return { success: true, data: existing?.conversationId ?? "conv_000" };
  }
  return createConversationInAppwrite(creatorId);
}

/** Kirim pesan teks ke dalam percakapan. */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<ServiceResult<ChatMessage>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return {
      success: true,
      data: {
        id: `msg_mock_${Date.now()}`,
        conversationId,
        senderId: "umkm_001",
        senderRole: "umkm",
        type: "text",
        content,
        isRead: true,
        createdAt: new Date().toISOString(),
      },
    };
  }
  return sendMessageInAppwrite(conversationId, content);
}

export type { CreateOfferInput };

/**
 * Bayar satu order Rate Card. `amount` harus persis `order.amount` — UMKM
 * membayar harga rate card tanpa tambahan (seller-side, ADR-008).
 */
export async function createOrderPayment(input: {
  orderId: string;
  amount: number;
  finishUrl?: string;
}): Promise<ServiceResult<PaymentIntent>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(600);
    return {
      success: true,
      data: {
        paymentId: `pay_mock_${Date.now()}`,
        gateway: "midtrans",
        status: "pending",
      },
    };
  }
  return createOrderPaymentInAppwrite(input);
}

/**
 * Kirim Custom Offer. UMKM-only — docs/02_Modules/Offers/30_Business_Rules.md:13.
 * Mengembalikan offerId.
 */
export async function createOffer(input: CreateOfferInput): Promise<ServiceResult<string>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(500);
    return { success: true, data: `offer_mock_${Date.now()}` };
  }
  return createOfferInAppwrite(input);
}

export async function getTransactions(): Promise<ServiceResult<Transaction[]>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return { success: true, data: mockTransactions };
  }
  return getTransactionsFromAppwrite();
}

export async function getTransactionById(id: string): Promise<ServiceResult<Transaction>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    const transaction = mockTransactions.find((tx) => tx.id === id);
    if (!transaction) {
      return { success: false, data: null, error: "Transaksi tidak ditemukan", code: "not_found" };
    }
    return { success: true, data: transaction };
  }
  return getTransactionByIdFromAppwrite(id);
}

export async function getFinanceSummary(): Promise<ServiceResult<UmkmFinanceSummary>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    
    // Total expenses: deposit + fee transactions that are success or escrow
    const totalExpenses = mockTransactions
      .filter((tx) => (tx.status === "paid" || tx.status === "held") && (tx.type === "deposit" || tx.type === "fee"))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const escrowBalance = mockTransactions
      .filter((tx) => tx.status === "held")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pendingPayments = mockTransactions
      .filter((tx) => tx.status === "pending")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const refundsReceived = mockTransactions
      .filter((tx) => tx.type === "refund" && tx.status === "refunded")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const platformFees = mockTransactions
      .filter((tx) => tx.type === "fee" && tx.status === "paid")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const successfulTransactionsCount = mockTransactions
      .filter((tx) => tx.status === "paid" || tx.status === "held" || tx.status === "refunded")
      .length;

    return {
      success: true,
      data: {
        totalExpenses,
        escrowBalance,
        pendingPayments,
        refundsReceived,
        platformFees,
        successfulTransactionsCount,
      },
    };
  }
  return getFinanceSummaryFromAppwrite();
}

/**
 * Ringkasan keuangan + escrow dalam satu perjalanan.
 *
 * Mock OFF → satu eksekusi Function `get-umkm-finance-summary`. Halaman Keuangan
 * harus memakai ini, bukan getFinanceSummary() + getEscrowOverview() bersamaan,
 * karena keduanya memicu agregasi backend yang sama dua kali.
 */
export async function getFinanceOverview(): Promise<ServiceResult<UmkmFinanceOverview>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    const [financeRes, escrowRes] = await Promise.all([
      getFinanceSummary(),
      getEscrowOverview(),
    ]);
    if (!financeRes.success || !financeRes.data || !escrowRes.success || !escrowRes.data) {
      return {
        success: false,
        data: null,
        error: financeRes.error ?? escrowRes.error ?? "Gagal memuat ringkasan keuangan.",
        code: financeRes.code ?? escrowRes.code ?? "unknown",
      };
    }
    return { success: true, data: { finance: financeRes.data, escrow: escrowRes.data } };
  }
  return getFinanceOverviewFromAppwrite();
}

export async function getEscrowOverview(): Promise<ServiceResult<EscrowOverview>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    
    const activeEscrow = mockTransactions
      .filter((tx) => tx.status === "held")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const campaignEscrow = mockTransactions
      .filter((tx) => tx.status === "held" && tx.referenceType === "campaign")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const rateCardEscrow = mockTransactions
      .filter((tx) => tx.status === "held" && tx.referenceType === "rate_card")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pendingRelease = rateCardEscrow; // Rate card custom offers pending verification / collab post URL
    const refundEligible = campaignEscrow; // Unused budget dari campaign completed

    return {
      success: true,
      data: {
        activeEscrow,
        pendingRelease,
        refundEligible,
        campaignEscrow,
        rateCardEscrow,
      },
    };
  }
  return getEscrowOverviewFromAppwrite();
}

// ── writes (Sprint 3) ────────────────────────────────────────────────────────

export type { CreateCampaignDraftInput, CampaignDraftResult };

/**
 * Buat campaign draft (campaigns + campaign_briefs + campaign_assets).
 * Mock: echo input jadi Campaign dengan id `mock_campaign_*` — TIDAK memutasi
 * mockCampaigns (mutasi module-level di dev server tidak konsisten). Id fabrikasi
 * kini hanya hidup di cabang mock.
 */
export async function createCampaignDraft(
  input: CreateCampaignDraftInput
): Promise<ServiceResult<CampaignDraftResult>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(600);
    const campaign: Campaign = {
      id: `mock_campaign_${Date.now()}`,
      umkmId: "mock_umkm",
      title: input.title,
      brief: input.brief?.briefDetail ?? "",
      externalAssetUrl: input.asset?.fileUrl ?? "",
      thumbnailUrl: "",
      niche: input.category as Campaign["niche"],
      status: "draft",
      creatorQuota: input.claimLimit,
      usedQuota: 0,
      pricePerThousandViews: input.rewardPer1000Views,
      totalBudgetEscrow: input.budget,
      usedBudget: 0,
      remainingBudget: 0,
      totalViews: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addDemoCampaign(campaign);
    return { success: true, data: { campaign, complete: true, warnings: [] } };
  }
  return createCampaignDraftInAppwrite(input);
}

export type { DuplicateCampaignOptions, CampaignEditRaw };

/**
 * Baca campaign draft untuk halaman edit wizard.
 * Mock: cari di demoStore berdasarkan id, kembalikan data mentah kosong kalau tidak ada.
 */
export async function getCampaignDraftForEdit(
  campaignId: string
): Promise<ServiceResult<CampaignEditRaw>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    const campaign = getDemoStore().campaigns.find((c) => c.id === campaignId);
    if (!campaign || campaign.status !== "draft") {
      return { success: false, error: "Campaign draft tidak ditemukan.", code: "not_found", data: null as unknown as CampaignEditRaw };
    }
    return { success: true, data: { campaign, warnings: [] } };
  }
  return getCampaignDraftForEditFromAppwrite(campaignId);
}

/**
 * Update campaign draft yang sudah ada di demoStore.
 */
export async function updateCampaignDraft(
  campaignId: string,
  input: CreateCampaignDraftInput
): Promise<ServiceResult<CampaignDraftResult>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(600);
    const campaign = getDemoStore().campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      return { success: false, error: "Campaign tidak ditemukan.", code: "not_found", data: null as unknown as CampaignDraftResult };
    }
    const updated: Campaign = {
      ...campaign,
      title: input.title,
      brief: input.brief?.briefDetail ?? campaign.brief,
      externalAssetUrl: input.asset?.fileUrl ?? campaign.externalAssetUrl,
      niche: (input.category as Campaign["niche"]) ?? campaign.niche,
      creatorQuota: input.claimLimit ?? campaign.creatorQuota,
      pricePerThousandViews: input.rewardPer1000Views ?? campaign.pricePerThousandViews,
      totalBudgetEscrow: input.budget ?? campaign.totalBudgetEscrow,
      updatedAt: new Date().toISOString(),
    };
    addDemoCampaign(updated);
    return { success: true, data: { campaign: updated, complete: true, warnings: [] } };
  }
  return updateCampaignDraftInAppwrite(campaignId, input);
}

/** Jeda / aktifkan kembali campaign di demoStore. */
export async function updateCampaignStatus(
  campaignId: string,
  next: "paused" | "active"
): Promise<ServiceResult<Campaign>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(400);
    const c = getDemoStore().campaigns.find((x) => x.id === campaignId);
    if (!c) return { success: false, data: null, error: "Campaign tidak ditemukan.", code: "not_found" };
    if (next === "paused" && c.status !== "active") {
      return { success: false, data: null, error: "Hanya campaign aktif yang bisa dijeda.", code: "validation" };
    }
    if (next === "active" && c.status !== "paused") {
      return { success: false, data: null, error: "Hanya campaign terjeda yang bisa diaktifkan kembali.", code: "validation" };
    }
    updateDemoCampaignStatus(campaignId, next);
    return { success: true, data: { ...c, status: next } };
  }
  return updateCampaignStatusInAppwrite(campaignId, next);
}

/** Duplikasi campaign jadi draft baru di demoStore. */
export async function duplicateCampaign(
  sourceId: string,
  newTitle: string,
  options: DuplicateCampaignOptions
): Promise<ServiceResult<CampaignDraftResult>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(600);
    const src = getDemoStore().campaigns.find((x) => x.id === sourceId);
    if (!src) return { success: false, data: null, error: "Campaign sumber tidak ditemukan.", code: "not_found" };
    const campaign: Campaign = {
      ...src,
      id: `mock_campaign_${Date.now()}`,
      title: newTitle,
      status: "draft",
      totalBudgetEscrow: options.copyBudget ? src.totalBudgetEscrow : MINIMUM_CAMPAIGN_BUDGET,
      usedQuota: 0,
      usedBudget: 0,
      totalViews: 0,
      externalAssetUrl: options.copyAssets ? src.externalAssetUrl : "",
      brief: options.copyBrief ? src.brief : "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addDemoCampaign(campaign);
    return { success: true, data: { campaign, complete: true, warnings: [] } };
  }
  return duplicateCampaignInAppwrite(sourceId, newTitle, options);
}

// ── profil UMKM / pengaturan (Sprint 3) ──────────────────────────────────────

export type { UmkmProfileWriteInput };

export async function getUmkmSettingsProfile(): Promise<ServiceResult<UmkmSettingsProfile>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(300);
    return { success: true, data: getDemoStore().umkmProfile };
  }
  return getUmkmSettingsProfileFromAppwrite();
}

export async function updateUmkmProfile(
  input: UmkmProfileWriteInput
): Promise<ServiceResult<UmkmSettingsProfile>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(500);
    return {
      success: true,
      data: {
        ...mockUmkmSettingsProfile,
        businessName: typeof input.businessName === "string" ? input.businessName : mockUmkmSettingsProfile.businessName,
        category: typeof input.category === "string" ? input.category : mockUmkmSettingsProfile.category,
        description: typeof input.description === "string" ? input.description : mockUmkmSettingsProfile.description,
        city: typeof input.city === "string" ? input.city : mockUmkmSettingsProfile.city,
        address: typeof input.address === "string" ? input.address : mockUmkmSettingsProfile.address,
        tiktok: typeof input.tiktok === "string" ? input.tiktok : mockUmkmSettingsProfile.tiktok,
        logoUrl: typeof input.logoUrl === "string" ? input.logoUrl : mockUmkmSettingsProfile.logoUrl,
      },
    };
  }
  return updateUmkmProfileInAppwrite(input);
}

export async function uploadUmkmLogo(file: File): Promise<ServiceResult<string>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(600);
    return { success: true, data: URL.createObjectURL(file) };
  }
  return uploadUmkmLogoInAppwrite(file);
}

// ── AI brief (Sprint 3) ──────────────────────────────────────────────────────

export type { AiBriefInput, AiBrief };

/**
 * Mock mengembalikan brief tetap setelah delay supaya UX loading/confirm/error
 * bisa diuji di browser hari ini — Function-nya sendiri masih kena blocker
 * APPWRITE_FUNCTION_API_KEY. Ini tempat yang jujur untuk contoh brief lama.
 */
export async function generateCampaignBrief(
  input: AiBriefInput
): Promise<ServiceResult<AiBrief>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(1400);
    return {
      success: true,
      data: {
        objective: `Meningkatkan awareness ${input.productName ?? "produk"} di kalangan pengguna TikTok.`,
        contentAngle: "Daily vlog santai menikmati produk di sore hari.",
        cta: input.goal ?? "Kunjungi toko",
        briefDetail: [
          "Konsep Video:",
          "Daily vlog santai saat menikmati produk.",
          "",
          "Panduan Produksi:",
          "- Tunjukkan kemasan produk dengan jelas di awal video.",
          "- Ambil close-up detail tekstur dan penyajian produk.",
          "- Perlihatkan reaksi jujur saat mencoba produk.",
          "- Tutup video dengan mengarahkan penonton ke tautan di bio.",
        ].join("\n"),
        doAndDont: {
          do: [
            "Wajib menunjukkan kemasan di awal video",
            "Wajib memperlihatkan reaksi saat mencoba produk",
          ],
          dont: ["membandingkan produk dengan kompetitor", "menggunakan musik berhak cipta"],
        },
      },
    };
  }
  return generateCampaignBriefFromAppwrite(input);
}

// ── pembayaran campaign (Sprint 3 / 6b) ──────────────────────────────────────

export type { PaymentIntent };

/**
 * Mock mengembalikan intent tanpa snapToken/redirectUrl, sehingga modal jatuh ke
 * jalur "berhasil" lokal dan UX mock tidak berubah.
 */
export async function createCampaignPayment(input: {
  campaignId: string;
  budget: number;
}): Promise<ServiceResult<PaymentIntent>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(800);
    return {
      success: true,
      data: {
        paymentId: `mock_pay_${Date.now()}`,
        gateway: "midtrans",
        status: "pending",
      },
    };
  }
  return createCampaignPaymentInAppwrite(input);
}

// ── Alur A: terbitkan & review (Sprint 4) ────────────────────────────────────

export type { ReviewSubmissionInput };

/**
 * Terbitkan campaign draft. Mock menegakkan guard yang sama, termasuk
 * `remainingBudget` — supaya pesan "dana belum masuk" bisa diuji tanpa Appwrite.
 */
export async function publishCampaign(campaignId: string): Promise<ServiceResult<Campaign>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(600);
    const c = getDemoStore().campaigns.find((x) => x.id === campaignId);
    if (!c) return { success: false, data: null, error: "Campaign tidak ditemukan.", code: "not_found" };
    if (c.status !== "draft") {
      return {
        success: false,
        data: null,
        error: "Hanya campaign draft yang bisa diterbitkan.",
        code: "validation",
      };
    }
    // Mock tidak punya remainingBudget terpisah; totalBudgetEscrow berperan sama.
    if (c.totalBudgetEscrow <= 0) {
      return {
        success: false,
        data: null,
        error: "Dana campaign belum masuk. Tunggu beberapa saat setelah pembayaran, lalu coba lagi.",
        code: "validation",
      };
    }
    updateDemoCampaignStatus(campaignId, "active");
    return { success: true, data: { ...c, status: "active", remainingBudget: c.totalBudgetEscrow } };
  }
  return publishCampaignInAppwrite(campaignId);
}

/** Setujui / tolak submission. `views` wajib saat approve — lihat B-1. */
export async function reviewSubmission(
  input: ReviewSubmissionInput
): Promise<ServiceResult<null>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(700);
    const s = mockSubmissions.find((x) => x.id === input.submissionId);
    if (!s) return { success: false, data: null, error: "Submission tidak ditemukan.", code: "not_found" };
    if (s.validationStatus !== "pending") {
      return {
        success: false,
        data: null,
        error: "Submission ini sudah pernah direview.",
        code: "validation",
      };
    }
    if (input.status === "approved" && (!Number.isInteger(input.views) || input.views < 0)) {
      return { success: false, data: null, error: "Jumlah views tidak valid.", code: "validation" };
    }
    return { success: true, data: null };
  }
  return reviewSubmissionInAppwrite(input);
}

// ── hapus & batalkan (Sprint 3.5) ────────────────────────────────────────────
//
// Mock menegakkan guard status yang SAMA dengan jalur Appwrite, bukan sekadar
// mengembalikan sukses. Kalau mock selalu berhasil, UI tidak akan pernah
// menampilkan pesan penolakan sampai mock dimatikan — persis pola "toast palsu"
// yang dibersihkan di Sprint 3.

/** Hapus campaign draft beserta brief & asetnya. Hanya status `draft`. */
export async function deleteCampaignDraft(campaignId: string): Promise<ServiceResult<null>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(500);
    const c = getDemoStore().campaigns.find((x) => x.id === campaignId);
    if (!c) return { success: false, data: null, error: "Campaign tidak ditemukan.", code: "not_found" };
    if (c.status !== "draft") {
      return {
        success: false,
        data: null,
        error: "Hanya campaign draft yang bisa dihapus. Campaign yang sudah tayang cukup dijeda.",
        code: "validation",
      };
    }
    deleteDemoCampaign(campaignId);
    return { success: true, data: null };
  }
  return deleteCampaignDraftInAppwrite(campaignId);
}

/** Hapus satu aset campaign. Hanya selama induknya masih `draft`. */
export async function removeCampaignAsset(assetId: string): Promise<ServiceResult<null>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(400);
    return { success: true, data: null };
  }
  return removeCampaignAssetInAppwrite(assetId);
}

/** Hapus custom offer yang masih `pending`. */
export async function deleteOffer(offerId: string): Promise<ServiceResult<null>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(400);
    return { success: true, data: null };
  }
  return deleteOfferInAppwrite(offerId);
}

/** Batalkan pesanan yang belum dibayar — status jadi `cancelled`, baris tetap ada. */
export async function cancelOrder(orderId: string): Promise<ServiceResult<null>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(500);
    const n = mockNegotiations.find((x) => x.id === orderId);
    if (!n) return { success: false, data: null, error: "Pesanan tidak ditemukan.", code: "not_found" };
    if (n.stage !== "pending_payment") {
      return {
        success: false,
        data: null,
        error:
          "Hanya pesanan yang belum dibayar yang bisa dibatalkan. Dana yang sudah masuk escrow harus lewat pengembalian dana.",
        code: "validation",
      };
    }
    return { success: true, data: null };
  }
  return cancelOrderInAppwrite(orderId);
}

/** Batalkan payment `pending` lewat Function `cancel-payment`. */
export async function cancelPayment(paymentId: string): Promise<ServiceResult<null>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(500);
    return { success: true, data: null };
  }
  return cancelPaymentInAppwrite(paymentId);
}
