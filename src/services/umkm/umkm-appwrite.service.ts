import { Query, ID, Permission, Role } from "appwrite";
import { databases } from "@/lib/appwrite/databases";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
  executeFunction,
  FunctionExecutionError,
  FUNCTION_IDS,
} from "@/lib/appwrite/functions";
import { uploadPublicFile, FileRuleError } from "@/lib/appwrite/storage";
import { type CampaignType, MINIMUM_CAMPAIGN_BUDGET, PLATFORM_FEE_RATE } from "@/types/domain";
import {
  createOfferSchema,
  type CreateOfferInput,
} from "@/lib/validations/offer.schema";
import { getNotificationsFromAppwrite } from "@/services/shared/notification-appwrite.service";
import type { NotifType } from "@/types/notification.types";
import {
  type Doc,
  str,
  num,
  ok,
  fail,
  failValidation,
  failFromError,
  failFromWriteError,
  requireUserId,
  noData,
} from "@/services/shared/service-result";
import {
  ServiceResult,
  UmkmProfile,
  UmkmSettingsProfile,
  UmkmDashboardSummary,
  UmkmOverviewData,
  Campaign,
  CampaignSubmission,
  CreatorProfile,
  PaginatedCreators,
  CreatorNiche,
  RateCardPackage,
  NegotiationOrder,
  Transaction,
  UmkmFinanceSummary,
  EscrowOverview,
  CampaignStatus,
  SubmissionStatus,
  FraudStatus,
  RateCardStatus,
  TransactionType,
  TransactionStatus,
} from "@/types/umkm-dashboard.types";

/**
 * Lapisan Appwrite dashboard UMKM (s1-appwrite-read).
 *
 * Sumber kebenaran skema: 00_BACKEND/appwrite.config.json (tables camelCase).
 * Pola: getSession() untuk kepemilikan → databases.listDocuments → mapper $id→id.
 * Semua nilai status di DB adalah string bebas; backend Function menulis nilai
 * kanon (@/types/domain), jadi mapper melakukan cast langsung.
 *
 * Agregasi & join yang tidak bisa dipetakan setia dari satu collection dilayani
 * Function DTO backend (00_BACKEND/functions/get-*), bukan dihitung di klien —
 * lihat docs/.../08-frontend-data-contract.md §6, §15, §28.
 *
 * CATATAN JUJUR (belum bisa runtime-test — NEXT_PUBLIC_USE_MOCK_DATA=true):
 * - Field view-model berikut masih tanpa kolom sumber: Campaign.thumbnailUrl/
 *   externalAssetUrl/totalViews, Negotiation.projectTitle/scope/creatorName.
 *   Diberi default terdokumentasi sampai kolom/Function-nya ada.
 * - CreatorProfile.niche baru terisi setelah kolom `creator_profiles.niche`
 *   di-push dan di-backfill; sebelum itu Function mengembalikan "lainnya".
 */

const DB = appwriteConfig.databaseId;

const COLLECTIONS = {
  campaigns: "campaigns",
  campaignBriefs: "campaign_briefs",
  campaignAssets: "campaign_assets",
  umkmProfiles: "umkm_profiles",
  creatorProfiles: "creator_profiles",
  submissions: "campaign_submissions",
  rateCards: "rate_cards",
  rateCardPackages: "rate_card_packages",
  claims: "campaign_claims",
  orders: "orders",
  offers: "offers",
  conversations: "conversations",
  messages: "messages",
  payments: "payments",
  users: "users",
} as const;

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Peta userId kreator → profil (displayName, avatarUrl).
 *
 * `creator_profiles` memakai `read("any")` di level koleksi (sama dengan
 * `umkm_profiles`) jadi join ini sah dari browser. `harden-permissions.mjs:25-28`
 * menyatakan `read("any")` ini disengaja dan tidak akan dicabut.
 */
async function loadCreatorProfiles(creatorIds: string[]): Promise<Map<string, Doc>> {
  const unique = Array.from(new Set(creatorIds.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const res = await databases.listDocuments(DB, COLLECTIONS.creatorProfiles, [
    Query.equal("userId", unique.slice(0, 100)),
    Query.limit(100),
  ]);
  return new Map(
    (res.documents as unknown as Doc[]).map((p) => [str(p.userId), p])
  );
}

// ── mappers ──────────────────────────────────────────────────────────────────

const mapCampaign = (d: Doc): Campaign => ({
  id: str(d.$id),
  umkmId: str(d.umkmId),
  title: str(d.title),
  brief: str(d.description),
  externalAssetUrl: "", // tak ada kolom sumber — aset ada di campaign_assets
  thumbnailUrl: "", // tak ada kolom sumber
  niche: (str(d.category) as CreatorNiche) || "lainnya",
  type: str(d.type) || undefined,
  status: str(d.status) as CampaignStatus,
  creatorQuota: num(d.claimLimit),
  usedQuota: num(d.totalClaims),
  pricePerThousandViews: num(d.rewardPer1000Views),
  totalBudgetEscrow: num(d.budget),
  usedBudget: num(d.spentAmount),
  remainingBudget: num(d.remainingBudget),
  totalViews: undefined, // tak ada kolom — perlu agregasi campaign_submissions
  createdAt: str(d.$createdAt),
  updatedAt: str(d.$updatedAt),
});

/** Terima profil opsional dan rate campaign untuk menghitung releasedFund tampilan. */
const mapSubmission = (d: Doc, creator?: Doc, ratePerThousandViews = 0): CampaignSubmission => {
  const viewsFinal = Boolean(d.views_final || d.viewsFinal);
  const lockedViews = num(d.views_count) || num(d.viewsCount);
  const views = viewsFinal && lockedViews > 0 ? lockedViews : num(d.views);
  const status = str(d.status) as SubmissionStatus;

  // ADR-008: Campaign fee is buyer-side. Creator receives full calculated reward.
  const calculatedReward =
    status === "approved" && ratePerThousandViews > 0
      ? Math.floor(views / 1000) * ratePerThousandViews
      : 0;

  return {
    id: str(d.$id),
    campaignId: str(d.campaignId),
    creatorId: str(d.creatorId),
    creatorName: creator ? str(creator.displayName) : "",
    creatorAvatarUrl: creator ? str(creator.avatarUrl) : "",
    platform: (str(d.platform) as "tiktok" | "instagram") || "tiktok",
    contentUrl: str(d.postUrl),
    actualViews: views,
    targetViews: 0,
    releasedFund: calculatedReward,
    validationStatus: status,
    fraudStatus: (str(d.fraudStatus) as FraudStatus) || "safe",
    rejectedReason: str(d.reviewNotes) || undefined,
    submittedAt: str(d.$createdAt),
  };
};

// CreatorProfile dipetakan di Function `get-creator-directory` — join lintas
// collection tidak bisa dilakukan di klien tanpa kehilangan field.

// NegotiationOrder dipetakan di Function `get-umkm-negotiations`. Mapper lokal
// dulu ada di sini dan mengembalikan enam field kosong ("perlu join
// creator_profiles", "tak ada kolom sumber", …) karena `orders` sendirian
// memang tidak cukup — dan dua collection yang dibutuhkan (`escrows`, `orders`)
// bahkan tidak bisa dibaca klien sama sekali.

const PAYMENT_PURPOSE_TYPE: Record<string, TransactionType> = {
  campaign: "deposit",
  order: "payment",
  topup: "deposit",
};

const PAYMENT_PURPOSE_LABEL: Record<string, string> = {
  campaign: "Deposit budget campaign",
  order: "Pembayaran order rate card",
  topup: "Top up saldo",
};

const mapTransaction = (d: Doc): Transaction => {
  const campaignId = str(d.campaign_id);
  const purpose = str(d.purpose);
  const gateway = str(d.gateway);
  const gatewaySuffix =
    gateway === "midtrans"
      ? " via Midtrans"
      : gateway === "manual-dev"
        ? " (funding manual)"
        : "";
  return {
    id: str(d.$id),
    userId: str(d.user_id),
    referenceId: campaignId || str(d.order_id),
    referenceType: campaignId ? "campaign" : "rate_card",
    amount: num(d.amount),
    baseAmount: num(d.amount),
    feeAmount: num(d.fee_amount),
    totalAmount: num(d.amount) + num(d.fee_amount),
    purpose: purpose,
    type: PAYMENT_PURPOSE_TYPE[purpose] ?? "payment",
    status: str(d.status) as TransactionStatus,
    description: (PAYMENT_PURPOSE_LABEL[purpose] ?? purpose) + gatewaySuffix,
    midtransOrderId: str(d.gateway_reference) || undefined,
    redirectUrl: str(d.redirect_url) || undefined,
    createdAt: str(d.paid_at) || str(d.$createdAt),
  };
};

// ── KOMPOSIT via Function DTO ────────────────────────────────────────────────
//
// Function menegakkan kepemilikan sendiri lewat header `x-appwrite-user-id`
// (sesi aktif), jadi userId TIDAK pernah dikirim dari klien — tidak bisa dipalsukan.

/** Join `users` + `umkm_profiles` + akun Auth → Function `get-umkm-profile`. */
export async function getUmkmProfileFromAppwrite(): Promise<ServiceResult<UmkmProfile>> {
  try {
    const data = await executeFunction<UmkmProfile>(FUNCTION_IDS.umkmProfile);
    return { success: true, data };
  } catch (err) {
    return failFromError<UmkmProfile>(err, null as unknown as UmkmProfile);
  }
}

/** Agregasi campaigns + campaign_submissions + orders + escrows. */
export async function getDashboardSummaryFromAppwrite(): Promise<ServiceResult<UmkmDashboardSummary>> {
  try {
    const data = await executeFunction<UmkmDashboardSummary>(FUNCTION_IDS.umkmDashboardSummary);
    return { success: true, data };
  } catch (err) {
    return failFromError<UmkmDashboardSummary>(err, null as unknown as UmkmDashboardSummary);
  }
}

/**
 * View-model Overview (s5-overview-dto).
 *
 * Sebelumnya `getOverview()` tidak punya cabang Appwrite sama sekali — ia
 * mengembalikan `success: false` harfiah saat mock OFF, sehingga halaman
 * pertama yang dilihat UMKM setelah login adalah kotak error. Function
 * `get-umkm-dashboard-summary` sudah ada sejak Sprint 1; yang belum ada hanya
 * perakitannya jadi bentuk yang dirender halaman.
 *
 * Tiga sumber, satu perjalanan:
 * - profil ...... Function `get-umkm-profile` (nama usaha untuk header & chrome)
 * - metrik ...... Function `get-umkm-dashboard-summary` (agregasi, termasuk uang)
 * - campaign .... query langsung; juga sumber `creatorJoined`
 *
 * `creatorJoined` dihitung di klien sebagai Σ `usedQuota`. Ini pencacahan klaim,
 * BUKAN perhitungan uang, jadi tidak melanggar §26 yang melarang klien
 * menjumlahkan escrow/wallet sendiri.
 *
 * `insights` dibiarkan undefined: tidak ada mesin insight di backend, dan
 * kalimat "Campaign Kuliner 28% lebih tinggi" di mock tidak punya sumber data.
 */
export async function getOverviewFromAppwrite(): Promise<ServiceResult<UmkmOverviewData>> {
  const [profileRes, summaryRes, campaignsRes, activitiesRes] = await Promise.all([
    getUmkmProfileFromAppwrite(),
    getDashboardSummaryFromAppwrite(),
    getCampaignsFromAppwrite(),
    getNotificationsFromAppwrite("umkm"),
  ]);

  // Profil & metrik adalah isi halaman; tanpa keduanya tidak ada yang bisa
  // ditampilkan selain angka kosong yang menyesatkan.
  if (!profileRes.success || !profileRes.data) {
    return fail<UmkmOverviewData>(
      profileRes.error ?? "Gagal memuat profil usaha.",
      profileRes.code ?? "unknown",
      noData<UmkmOverviewData>()
    );
  }
  if (!summaryRes.success || !summaryRes.data) {
    return fail<UmkmOverviewData>(
      summaryRes.error ?? "Gagal memuat ringkasan dashboard.",
      summaryRes.code ?? "unknown",
      noData<UmkmOverviewData>()
    );
  }

  const campaigns = campaignsRes.data ?? [];
  const summary = summaryRes.data;

  return ok<UmkmOverviewData>({
    businessName: profileRes.data.businessName,
    campaigns,
    kpis: {
      campaignActive: summary.activeCampaigns,
      campaignCompleted: summary.completedCampaigns,
      totalSpend: summary.totalSpent,
      escrowBalance: summary.escrowBalance,
      creatorJoined: campaigns.reduce((n, c) => n + c.usedQuota, 0),
      viewsValid: summary.totalViews,
      pendingSubmissions: summary.pendingSubmissions,
      isTruncated: summary.isTruncated,
    },
    // Notifikasi gagal/kosong bukan alasan menggagalkan halaman — timeline
    // tinggal kosong. Sampai permission baris Function penulis diperbaiki
    // (§B handoff Alur B), daftar ini memang bisa pulang kosong.
    activities: (activitiesRes.data ?? []).slice(0, 8).map((n) => ({
      id: n.id,
      title: n.title,
      description: n.message,
      type: ACTIVITY_TYPE_BY_NOTIF[n.type],
      time: n.timestamp,
    })),
  });
}

/** Kategori notifikasi → ikon timeline aktivitas. */
const ACTIVITY_TYPE_BY_NOTIF: Record<
  NotifType,
  NonNullable<UmkmOverviewData["activities"]>[number]["type"]
> = {
  campaign: "campaign",
  keuangan: "payment",
  negosiasi: "progress",
  rate_card: "progress",
  sistem: "progress",
};

/**
 * `get-umkm-finance-summary` mengembalikan finance + escrow sekali jalan supaya
 * halaman Keuangan tidak memicu dua agregasi identik atas data yang sama.
 */
export type UmkmFinanceOverview = {
  finance: UmkmFinanceSummary;
  escrow: EscrowOverview;
};

/**
 * Satu eksekusi Function untuk finance + escrow sekaligus. Halaman Keuangan
 * WAJIB memakai ini; memanggil getFinanceSummary + getEscrowOverview bersamaan
 * akan menjalankan agregasi yang sama dua kali.
 */
export async function getFinanceOverviewFromAppwrite(): Promise<ServiceResult<UmkmFinanceOverview>> {
  try {
    const data = await executeFunction<UmkmFinanceOverview>(FUNCTION_IDS.umkmFinanceSummary);
    return { success: true, data };
  } catch (err) {
    return failFromError<UmkmFinanceOverview>(err, null as unknown as UmkmFinanceOverview);
  }
}

/** Dipakai bila hanya ringkasan finance yang dibutuhkan (tanpa escrow). */
export async function getFinanceSummaryFromAppwrite(): Promise<ServiceResult<UmkmFinanceSummary>> {
  try {
    const data = await executeFunction<UmkmFinanceOverview>(FUNCTION_IDS.umkmFinanceSummary);
    return { success: true, data: data.finance };
  } catch (err) {
    return failFromError<UmkmFinanceSummary>(err, null as unknown as UmkmFinanceSummary);
  }
}

/** Dipakai bila hanya escrow yang dibutuhkan (tanpa ringkasan finance). */
export async function getEscrowOverviewFromAppwrite(): Promise<ServiceResult<EscrowOverview>> {
  try {
    const data = await executeFunction<UmkmFinanceOverview>(FUNCTION_IDS.umkmFinanceSummary);
    return { success: true, data: data.escrow };
  } catch (err) {
    return failFromError<EscrowOverview>(err, null as unknown as EscrowOverview);
  }
}

// ── READS single-collection ──────────────────────────────────────────────────

export async function getCampaignsFromAppwrite(): Promise<ServiceResult<Campaign[]>> {
  const auth = await requireUserId<Campaign[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const res = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("umkmId", auth.userId),
      Query.orderDesc("$updatedAt"),
      Query.limit(100),
    ]);
    return { success: true, data: res.documents.map((d) => mapCampaign(d as unknown as Doc)) };
  } catch (err) {
    return failFromError<Campaign[]>(err, []);
  }
}

export async function getCampaignByIdFromAppwrite(id: string): Promise<ServiceResult<Campaign>> {
  const auth = await requireUserId<Campaign>(null as unknown as Campaign);
  if (!auth.ok) return auth.result;
  try {
    const res = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("$id", id),
      Query.equal("umkmId", auth.userId),
      Query.limit(1),
    ]);
    const doc = res.documents[0];
    if (!doc) {
      return { success: false, data: null, error: "Campaign tidak ditemukan", code: "not_found" };
    }
    return { success: true, data: mapCampaign(doc as unknown as Doc) };
  } catch (err) {
    return failFromError<Campaign>(err, null as unknown as Campaign);
  }
}

export async function getCampaignSubmissionsFromAppwrite(
  campaignId: string
): Promise<ServiceResult<CampaignSubmission[]>> {
  const auth = await requireUserId<CampaignSubmission[]>([]);
  if (!auth.ok) return auth.result;
  try {
    // Kepemilikan: pastikan campaign milik UMKM ini sebelum membaca submission-nya.
    const owned = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("$id", campaignId),
      Query.equal("umkmId", auth.userId),
      Query.limit(1),
    ]);
    if (!owned.documents[0]) {
      return { success: false, data: [], error: "Campaign tidak ditemukan", code: "not_found" };
    }
    const rate = num((owned.documents[0] as unknown as Doc).rewardPer1000Views);
    const res = await databases.listDocuments(DB, COLLECTIONS.submissions, [
      Query.equal("campaignId", campaignId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);
    const docs = res.documents as unknown as Doc[];
    const creatorProfiles = await loadCreatorProfiles(docs.map((d) => str(d.creatorId)));
    return {
      success: true,
      data: docs.map((d) => mapSubmission(d, creatorProfiles.get(str(d.creatorId)), rate)),
    };
  } catch (err) {
    return failFromError<CampaignSubmission[]>(err, []);
  }
}

/** UMKM-PERF-01: aggregate submission status counts for all campaigns owned by the UMKM in one query.
 *
 * Pattern: list campaigns → collect IDs → single listDocuments with campaignId=[...] →
 * group by campaignId in memory.  Zero per-campaign requests.
 *
 * Returns `Record<campaignId, { pending; valid; dispute }>`.
 * Missing campaign IDs are absent from the map (caller defaults to 0).
 */
export async function getSubmissionCountsFromAppwrite(
  campaignIds: string[]
): Promise<ServiceResult<Record<string, { pending: number; valid: number; dispute: number }>>> {
  const empty: Record<string, { pending: number; valid: number; dispute: number }> = {};
  if (campaignIds.length === 0) return { success: true, data: empty };

  const auth = await requireUserId<typeof empty>(empty);
  if (!auth.ok) return auth.result;

  try {
    const counts: Record<string, { pending: number; valid: number; dispute: number }> = {};

    // Appwrite `equal(field, [...])` dibatasi 100 nilai. <=100 campaign tetap
    // satu query; >100 dipecah per batch tanpa kembali ke pola N+1.
    for (const ids of chunk(campaignIds, 100)) {
      const res = await databases.listDocuments(DB, COLLECTIONS.submissions, [
        Query.equal("campaignId", ids),
        Query.limit(5000),
      ]);

      for (const doc of res.documents as unknown as Doc[]) {
        const cid = str(doc.campaignId);
        if (!counts[cid]) counts[cid] = { pending: 0, valid: 0, dispute: 0 };
        if (str(doc.status) === "pending") counts[cid].pending++;
        if (str(doc.status) === "approved") counts[cid].valid++;
        if (str(doc.fraudStatus) !== "safe" && str(doc.fraudStatus) !== "") counts[cid].dispute++;
      }
    }
    return { success: true, data: counts };
  } catch (err) {
    return failFromError<typeof empty>(err, empty);
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function getPendingSubmissionsFromAppwrite(): Promise<ServiceResult<CampaignSubmission[]>> {
  const auth = await requireUserId<CampaignSubmission[]>([]);
  if (!auth.ok) return auth.result;
  try {
    // submissions tak punya umkmId → ambil campaign milik UMKM dulu, lalu filter.
    const campaigns = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("umkmId", auth.userId),
      Query.limit(100),
    ]);
    const campaignDocs = campaigns.documents as unknown as Doc[];
    const campaignIds = campaignDocs.map((c) => str(c.$id));
    if (campaignIds.length === 0) return { success: true, data: [] };

    const rateMap = new Map(campaignDocs.map((c) => [str(c.$id), num(c.rewardPer1000Views)]));

    const res = await databases.listDocuments(DB, COLLECTIONS.submissions, [
      Query.equal("campaignId", campaignIds),
      Query.equal("status", "pending"),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);
    const docs = res.documents as unknown as Doc[];
    const creatorProfiles = await loadCreatorProfiles(docs.map((d) => str(d.creatorId)));
    return {
      success: true,
      data: docs.map((d) =>
        mapSubmission(d, creatorProfiles.get(str(d.creatorId)), rateMap.get(str(d.campaignId)) ?? 0)
      ),
    };
  } catch (err) {
    return failFromError<CampaignSubmission[]>(err, []);
  }
}

/**
 * Direktori kreator via Function `get-creator-directory`.
 *
 * Query langsung ke `creator_profiles` tidak dipakai lagi: username,
 * engagementRate (creator_social_accounts) dan startingPrice (rate_cards →
 * rate_card_packages termurah) butuh join lintas collection.
 *
 * `id` yang dikembalikan adalah `userId`, BUKAN `$id` dokumen profil — itu kunci
 * yang dipakai orders.creatorId, rate_cards.creatorId dan wallets.userId.
 */
export async function getCreatorsFromAppwrite(
  limit: number = 100,
  cursor?: string
): Promise<ServiceResult<PaginatedCreators>> {
  try {
    const data = await executeFunction<PaginatedCreators>(FUNCTION_IDS.creatorDirectory, { limit, cursor });
    return { success: true, data };
  } catch (err) {
    return failFromError<PaginatedCreators>(err, { items: [], total: 0, nextCursor: null });
  }
}

export async function getCreatorByIdFromAppwrite(id: string): Promise<ServiceResult<CreatorProfile>> {
  try {
    const data = await executeFunction<CreatorProfile>(FUNCTION_IDS.creatorDirectory, { creatorId: id });
    return { success: true, data };
  } catch (err) {
    if (err instanceof FunctionExecutionError && err.code === "not_found") {
      return { success: false, data: null, error: "Kreator tidak ditemukan", code: "not_found" };
    }
    return failFromError<CreatorProfile>(err, null as unknown as CreatorProfile);
  }
}

export async function getCreatorRateCardsFromAppwrite(
  creatorId: string
): Promise<ServiceResult<RateCardPackage[]>> {
  const auth = await requireUserId<RateCardPackage[]>([]);
  if (!auth.ok) return auth.result;
  try {
    // creatorId & status ada di parent `rate_cards`; paket ada di `rate_card_packages`.
    const cards = await databases.listDocuments(DB, COLLECTIONS.rateCards, [
      Query.equal("creatorId", creatorId),
      Query.equal("status", "published"),
      Query.limit(100),
    ]);
    if (cards.documents.length === 0) return { success: true, data: [] };

    // Peta rateCardId → status parent, untuk RateCardPackage.status.
    const statusByCard = new Map<string, RateCardStatus>();
    for (const c of cards.documents) {
      const cd = c as unknown as Doc;
      statusByCard.set(str(cd.$id), str(cd.status) as RateCardStatus);
    }
    const cardIds = Array.from(statusByCard.keys());

    const packages = await databases.listDocuments(DB, COLLECTIONS.rateCardPackages, [
      Query.equal("rateCardId", cardIds),
      Query.limit(100),
    ]);
    const data: RateCardPackage[] = packages.documents.map((p) => {
      const pd = p as unknown as Doc;
      const rateCardId = str(pd.rateCardId);
      return {
        id: str(pd.$id),
        creatorId,
        name: str(pd.name),
        description: str(pd.description),
        price: num(pd.price),
        deliverable: str(pd.output),
        estimatedDays: num(pd.deliveryDays),
        revisionLimit: num(pd.revisionLimit),
        status: statusByCard.get(rateCardId) ?? "published",
      };
    });
    return { success: true, data };
  } catch (err) {
    return failFromError<RateCardPackage[]>(err, []);
  }
}

/**
 * Daftar ruang negosiasi UMKM → Function `get-umkm-negotiations`.
 *
 * Versi sebelumnya beriterasi atas `orders` di klien dan mengembalikan enam
 * field kosong. Dua alasan kenapa itu tidak bisa ditambal di sini:
 * 1. Di Alur B order lahir PALING AKHIR (chat → offer → accept → order), jadi
 *    daftar yang di-key order menyembunyikan seluruh tahap negosiasi.
 * 2. `escrows` punya `$permissions` kosong + rowSecurity dan tidak pernah
 *    dipasangi permission baris, jadi status escrow mustahil dibaca klien.
 */
export async function getNegotiationsFromAppwrite(): Promise<ServiceResult<NegotiationOrder[]>> {
  try {
    const data = await executeFunction<NegotiationOrder[]>(FUNCTION_IDS.umkmNegotiations);
    return ok(data);
  } catch (err) {
    return failFromError<NegotiationOrder[]>(err, []);
  }
}

/** Satu ruang negosiasi. `id` di sini adalah conversationId, bukan orderId. */
export async function getNegotiationByIdFromAppwrite(
  conversationId: string
): Promise<ServiceResult<NegotiationOrder>> {
  const empty = null as unknown as NegotiationOrder;
  try {
    const data = await executeFunction<NegotiationOrder>(FUNCTION_IDS.umkmNegotiations, {
      conversationId,
    });
    return ok(data);
  } catch (err) {
    return failFromError<NegotiationOrder>(err, empty);
  }
}

/**
 * Kirim Custom Offer. UMKM-ONLY —
 * docs/02_Modules/Offers/30_Business_Rules.md:13.
 *
 * Aturan itu ditegakkan di sini oleh permission baris, bukan hanya oleh
 * ketiadaan tombol di UI kreator: `update` diberikan ke KREATOR (dia yang
 * accept/reject) dan `delete` ke UMKM (dia yang membatalkan). UMKM sengaja
 * TIDAK diberi `update` — mengubah harga offer yang sudah dikirim, setelah
 * kreator melihatnya, bukan negosiasi yang jujur.
 *
 * Mirror 00_BACKEND/src/services/offer.service.ts:147-150.
 */
export async function createOfferInAppwrite(
  input: CreateOfferInput
): Promise<ServiceResult<string>> {
  const auth = await requireUserId<string>("");
  if (!auth.ok) return auth.result;

  const parsed = createOfferSchema.safeParse(input);
  if (!parsed.success) {
    return failValidation<string>(parsed.error.issues[0]?.message ?? "Data offer tidak valid.", "");
  }
  const offer = parsed.data;

  try {
    // Lewat Function: baris `offers` harus terbaca kreator dan di-update kreator
    // (dia yang accept/reject), sementara klien Appwrite tidak boleh memasang
    // permission untuk user lain. Peserta percakapan, pembagian permission, dan
    // kartu offer di chat semuanya ditentukan di sisi server — `creatorId` yang
    // dikirim di sini cuma dicocokkan, tidak dipercaya.
    const data = await executeFunction<{ offerId?: string }>(FUNCTION_IDS.createOffer, {
      conversationId: offer.conversationId,
      creatorId: offer.creatorId,
      ...(offer.packageId ? { packageId: offer.packageId } : {}),
      title: offer.title,
      description: offer.description || "",
      price: offer.price,
      deadline: offer.deadline,
      revisionLimit: offer.revisionLimit,
    });

    const offerId = str(data?.offerId);
    if (!offerId) return fail("Penawaran gagal dikirim.", "server", "");
    return ok(offerId);
  } catch (err) {
    return failFromWriteError<string>(err, "", "Data offer tidak valid.", "createOffer");
  }
}

export async function getTransactionsFromAppwrite(): Promise<ServiceResult<Transaction[]>> {
  const auth = await requireUserId<Transaction[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const res = await databases.listDocuments(DB, COLLECTIONS.payments, [
      Query.equal("user_id", auth.userId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);
    return { success: true, data: res.documents.map((d) => mapTransaction(d as unknown as Doc)) };
  } catch (err) {
    return failFromError<Transaction[]>(err, []);
  }
}

export async function getTransactionByIdFromAppwrite(id: string): Promise<ServiceResult<Transaction>> {
  const auth = await requireUserId<Transaction>(null as unknown as Transaction);
  if (!auth.ok) return auth.result;
  try {
    const res = await databases.listDocuments(DB, COLLECTIONS.payments, [
      Query.equal("$id", id),
      Query.equal("user_id", auth.userId),
      Query.limit(1),
    ]);
    const doc = res.documents[0];
    if (!doc) {
      return { success: false, data: null, error: "Transaksi tidak ditemukan", code: "not_found" };
    }
    return { success: true, data: mapTransaction(doc as unknown as Doc) };
  } catch (err) {
    return failFromError<Transaction>(err, null as unknown as Transaction);
  }
}

// ── writes (Sprint 3) ────────────────────────────────────────────────────────

export type CreateCampaignDraftInput = {
  title: string;
  category: string;
  type: CampaignType;
  description: string;
  budget: number;
  rewardPer1000Views: number;
  claimLimit: number;
  submissionDays?: number;
  /** Brief sudah dikomposisi klien (composeBriefDetail/packDoAndDontJson). */
  brief?: {
    briefDetail: string;
    contentAngle: string;
    cta: string;
    objective?: string;
    doAndDont?: string;
    generatedByAi?: boolean;
  };
  asset?: { fileUrl: string; fileName?: string };
};

export type CampaignDraftResult = {
  campaign: Campaign;
  /** false bila brief/asset gagal ditulis — campaign-nya tetap ada & bisa diedit. */
  complete: boolean;
  warnings: string[];
};

/**
 * Tulis campaign draft (status "draft") + campaign_briefs + campaign_assets.
 * TANPA transaction — SDK 25 mendukungnya tapi belum teruji di server ini.
 * Kebijakan gagal: campaign row adalah sumber keberhasilan; brief/asset yang
 * gagal hanya menambah warning, campaign tidak di-rollback (draft tetap ada).
 * Permission baris read(any)/update+delete(owner) — grant delete adalah satu-
 * satunya cara baris ini nanti bisa dihapus (tak ada collection delete("users")).
 */
export async function createCampaignDraftInAppwrite(
  input: CreateCampaignDraftInput
): Promise<ServiceResult<CampaignDraftResult>> {
  const empty = null as unknown as CampaignDraftResult;
  const auth = await requireUserId<CampaignDraftResult>(empty);
  if (!auth.ok) return auth.result;
  const uid = auth.userId;
  const campaignPerms = [
    Permission.read(Role.user(uid)),
    Permission.delete(Role.user(uid)),
  ];
  const subDocPerms = [
    Permission.read(Role.any()),
    Permission.update(Role.user(uid)),
    Permission.delete(Role.user(uid)),
  ];

  let campaignDoc: Doc;
  try {
    campaignDoc = (await databases.createDocument(
      DB,
      COLLECTIONS.campaigns,
      ID.unique(),
      {
        umkmId: uid,
        title: input.title.trim(),
        category: input.category,
        type: input.type,
        platforms: ["tiktok"],
        description: input.description.trim(),
        budget: input.budget,
        rewardPer1000Views: input.rewardPer1000Views,
        status: "draft",
        claimLimit: input.claimLimit,
        submissionDays: input.submissionDays ?? 7,
        totalClaims: 0,
        spentAmount: 0,
        remainingBudget: 0,
      },
      campaignPerms
    )) as unknown as Doc;
  } catch (err) {
    return failFromWriteError<CampaignDraftResult>(err, empty);
  }

  const warnings: string[] = [];
  const campaignId = str(campaignDoc.$id);

  if (input.brief) {
    try {
      await databases.createDocument(
        DB,
        COLLECTIONS.campaignBriefs,
        ID.unique(),
        {
          campaignId,
          objective: input.brief.objective ?? "",
          contentAngle: input.brief.contentAngle,
          cta: input.brief.cta,
          briefDetail: input.brief.briefDetail,
          doAndDont: input.brief.doAndDont ?? "",
          generatedByAi: input.brief.generatedByAi ?? false,
        },
        subDocPerms
      );
    } catch (err) {
      console.error("[createCampaignDraft] Failed to write brief:", err);
      warnings.push("Brief belum tersimpan — buka draft untuk melengkapi.");
    }
  }

  if (input.asset) {
    try {
      await databases.createDocument(
        DB,
        COLLECTIONS.campaignAssets,
        ID.unique(),
        {
          campaignId,
          source: "external",
          type: "link",
          fileUrl: input.asset.fileUrl,
          fileName: input.asset.fileName ?? "Folder Aset Eksternal",
        },
        subDocPerms
      );
    } catch (err) {
      console.error("[createCampaignDraft] Failed to write asset:", err);
      warnings.push("Tautan aset belum tersimpan — buka draft untuk melengkapi.");
    }
  }

  return ok<CampaignDraftResult>({
    campaign: mapCampaign(campaignDoc),
    complete: warnings.length === 0,
    warnings,
  });
}

/**
 * Ubah status campaign (jeda/aktifkan).
 * Dirutekan lewat patch-campaign-status Cloud Function karena baris campaign
 * tidak lagi punya Permission.update dari klien (fix SEC-H1 2026-08-08).
 */
export async function updateCampaignStatusInAppwrite(
  campaignId: string,
  next: "paused" | "active"
): Promise<ServiceResult<Campaign>> {
  const empty = null as unknown as Campaign;
  const auth = await requireUserId<Campaign>(empty);
  if (!auth.ok) return auth.result;
  try {
    const action = next === "paused" ? "pause" : "resume";
    await executeFunction(FUNCTION_IDS.patchCampaignStatus, { campaignId, action });
    // Baca ulang campaign terbaru setelah update
    const res = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("$id", campaignId),
      Query.equal("umkmId", auth.userId),
      Query.limit(1),
    ]);
    const doc = res.documents[0] as unknown as Doc | undefined;
    if (!doc) return fail("Campaign tidak ditemukan setelah update.", "not_found", empty);
    return ok(mapCampaign(doc));
  } catch (err) {
    return failFromWriteError<Campaign>(err, empty, undefined, "updateCampaignStatusInAppwrite");
  }
}

export type DuplicateCampaignOptions = {
  copyBrief: boolean;
  copyBudget: boolean;
  copyAssets: boolean;
};

/**
 * Duplikasi campaign lewat createCampaignDraftInAppwrite (satu jalur create).
 * Baca sumber ownership-filtered + brief/asset opsional sesuai options.
 */
export async function duplicateCampaignInAppwrite(
  sourceId: string,
  newTitle: string,
  options: DuplicateCampaignOptions
): Promise<ServiceResult<CampaignDraftResult>> {
  const empty = null as unknown as CampaignDraftResult;
  const auth = await requireUserId<CampaignDraftResult>(empty);
  if (!auth.ok) return auth.result;
  try {
    const srcRes = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("$id", sourceId),
      Query.equal("umkmId", auth.userId),
      Query.limit(1),
    ]);
    const src = srcRes.documents[0] as unknown as Doc | undefined;
    if (!src) return fail("Campaign sumber tidak ditemukan.", "not_found", empty);

    let brief: CreateCampaignDraftInput["brief"];
    if (options.copyBrief) {
      const bRes = await databases.listDocuments(DB, COLLECTIONS.campaignBriefs, [
        Query.equal("campaignId", sourceId),
        Query.limit(1),
      ]);
      const b = bRes.documents[0] as unknown as Doc | undefined;
      if (b) {
        brief = {
          briefDetail: str(b.briefDetail),
          contentAngle: str(b.contentAngle),
          cta: str(b.cta),
          objective: str(b.objective),
          doAndDont: str(b.doAndDont),
          generatedByAi: Boolean(b.generatedByAi),
        };
      }
    }

    let asset: CreateCampaignDraftInput["asset"];
    if (options.copyAssets) {
      const aRes = await databases.listDocuments(DB, COLLECTIONS.campaignAssets, [
        Query.equal("campaignId", sourceId),
        Query.limit(1),
      ]);
      const a = aRes.documents[0] as unknown as Doc | undefined;
      if (a) asset = { fileUrl: str(a.fileUrl), fileName: str(a.fileName) || undefined };
    }

    return createCampaignDraftInAppwrite({
      title: newTitle,
      category: str(src.category),
      type: (str(src.type) as CampaignType) || "ugc",
      description: str(src.description),
      budget: options.copyBudget ? num(src.budget) : MINIMUM_CAMPAIGN_BUDGET,
      rewardPer1000Views: num(src.rewardPer1000Views),
      claimLimit: num(src.claimLimit),
      submissionDays: num(src.submissionDays) || 7,
      brief,
      asset,
    });
  } catch (err) {
    return failFromWriteError<CampaignDraftResult>(err, empty);
  }
}

// ── profil UMKM / pengaturan (Sprint 3) ──────────────────────────────────────

const mapUmkmSettingsProfile = (d: Doc): UmkmSettingsProfile => ({
  docId: str(d.$id),
  userId: str(d.userId),
  businessName: str(d.businessName),
  category: str(d.category),
  description: str(d.description),
  city: str(d.city),
  address: str(d.address),
  tiktok: str(d.tiktok),
  logoUrl: str(d.logoUrl),
  isProfileCompleted: Boolean(d.isProfileCompleted),
});

/**
 * Baca baris umkm_profiles langsung (bukan lewat Function DTO): halaman
 * Pengaturan butuh 9 kolom, sedangkan get-umkm-profile mengembalikan 7 kolom
 * lain. `umkm_profiles` read("any") jadi query klien sah.
 */
export async function getUmkmSettingsProfileFromAppwrite(): Promise<
  ServiceResult<UmkmSettingsProfile>
> {
  const empty = null as unknown as UmkmSettingsProfile;
  const auth = await requireUserId<UmkmSettingsProfile>(empty);
  if (!auth.ok) return auth.result;
  try {
    const [resUmkm, resUser] = await Promise.all([
      databases.listDocuments(DB, COLLECTIONS.umkmProfiles, [
        Query.equal("userId", auth.userId),
        Query.limit(1),
      ]),
      databases.listDocuments(DB, COLLECTIONS.users, [
        Query.equal("userId", auth.userId),
        Query.limit(1),
      ]),
    ]);
    
    const doc = resUmkm.documents[0] as unknown as Doc | undefined;
    if (!doc) return fail("Profil UMKM tidak ditemukan.", "not_found", empty);
    
    const userDoc = resUser.documents[0] as unknown as Doc | undefined;
    const profile = {
      docId: str(doc.$id),
      userId: str(doc.userId),
      businessName: str(doc.businessName),
      category: str(doc.category),
      description: str(doc.description),
      city: str(doc.city),
      address: str(userDoc?.address),
      tiktok: str(doc.tiktok),
      logoUrl: str(doc.logoUrl),
      isProfileCompleted: doc.isProfileCompleted === true,
    };
    
    return ok(profile);
  } catch (err) {
    return failFromError<UmkmSettingsProfile>(err, empty);
  }
}

/**
 * Kolom yang boleh dikirim ke Function `update-profile`.
 * `isProfileCompleted` TIDAK ada di sini — flag hanya dihitung server-side.
 * `phone`/`address` mendarat di `users` (bukan `umkm_profiles`).
 */
const UMKM_PROFILE_WRITABLE = [
  "businessName",
  "category",
  "description",
  "city",
  "address",
  "tiktok",
  "logoUrl",
  "phone",
] as const;

export type UmkmProfileWriteInput = Partial<
  Record<(typeof UMKM_PROFILE_WRITABLE)[number], string>
>;

export async function updateUmkmProfileInAppwrite(
  input: UmkmProfileWriteInput
): Promise<ServiceResult<UmkmSettingsProfile>> {
  const empty = null as unknown as UmkmSettingsProfile;
  const auth = await requireUserId<UmkmSettingsProfile>(empty);
  if (!auth.ok) return auth.result;

  const payload: Record<string, string> = {};
  for (const key of UMKM_PROFILE_WRITABLE) {
    const value = input[key];
    if (value !== undefined) payload[key] = value;
  }
  if (Object.keys(payload).length === 0) {
    return failValidation("Tidak ada perubahan untuk disimpan.", empty);
  }

  try {
    await executeFunction(FUNCTION_IDS.updateProfile, payload);
    return getUmkmSettingsProfileFromAppwrite();
  } catch (err) {
    return failFromWriteError<UmkmSettingsProfile>(err, empty);
  }
}

/** Unggah logo ke bucket `logos` (client-writable) dan kembalikan URL-nya. */
export async function uploadUmkmLogoInAppwrite(file: File): Promise<ServiceResult<string>> {
  const auth = await requireUserId<string>("");
  if (!auth.ok) return auth.result;
  try {
    const uploaded = await uploadPublicFile("logos", file, auth.userId);
    return ok(uploaded.url);
  } catch (err) {
    if (err instanceof FileRuleError) return failValidation(err.message, "");
    return failFromWriteError<string>(err, "");
  }
}

// ── AI brief (Sprint 3) ──────────────────────────────────────────────────────

export type AiBriefInput = {
  description: string;
  type: CampaignType;
  productName?: string;
  targetMarket?: string;
  goal?: string;
  materials?: string[];
};

export type AiBrief = {
  objective: string;
  contentAngle: string;
  cta: string;
  briefDetail: string;
  doAndDont: { do: string[]; dont: string[] };
};

/**
 * Panggil Function `ai-brief`.
 *
 * Dua penghilangan sengaja dari body:
 * - TANPA `campaignId`: campaign belum ada di langkah 2, dan bila dikirim
 *   ai-brief menulis baris campaign_briefs sendiri yang bersaing dengan tulisan
 *   createCampaignDraft dan gagal senyap di batas kolom doAndDont (400 char).
 * - TANPA `userId`: ai-brief menerima userId dari klien (spoofable). Dikirim
 *   kosong: baris audit ai_requests terdegradasi, bukan dipalsukan. Handoff
 *   meminta backend membaca header x-appwrite-user-id seperti 10 Function lain.
 */
export async function generateCampaignBriefFromAppwrite(
  input: AiBriefInput
): Promise<ServiceResult<AiBrief>> {
  const empty = null as unknown as AiBrief;
  const auth = await requireUserId<AiBrief>(empty);
  if (!auth.ok) return auth.result;
  try {
    const res = await executeFunction<{ success: boolean; brief?: AiBrief; error?: string }>(
      FUNCTION_IDS.aiBrief,
      {
        description: input.description,
        type: input.type,
        productName: input.productName || "Not specified",
        targetMarket: input.targetMarket || "General",
        goal: input.goal || "Brand awareness",
        materials: input.materials ?? [],
      }
    );
    if (!res.success || !res.brief) {
      return fail(res.error ?? "Gagal menghasilkan brief AI. Coba lagi.", "server", empty);
    }
    return ok(res.brief);
  } catch (err) {
    return failFromWriteError<AiBrief>(err, empty);
  }
}

// ── pembayaran campaign (Sprint 3 / 6b) ──────────────────────────────────────

export type PaymentIntent = {
  paymentId: string;
  gateway: "midtrans";
  snapToken?: string;
  redirectUrl?: string;
  status: "pending";
  reused?: boolean;
};

/**
 * Buat payment untuk top-up escrow campaign lewat Function `create-payment`.
 * `amount` = budget DASAR; Function yang menurunkan fee 2% dan total_amount.
 * `payments` read-only dari klien, jadi jalur ini wajib lewat Function.
 */
export async function createCampaignPaymentInAppwrite(input: {
  campaignId: string;
  budget: number;
}): Promise<ServiceResult<PaymentIntent>> {
  const empty = null as unknown as PaymentIntent;
  const auth = await requireUserId<PaymentIntent>(empty);
  if (!auth.ok) return auth.result;
  try {
    const res = await executeFunction<PaymentIntent>(FUNCTION_IDS.createPayment, {
      purpose: "campaign",
      amount: input.budget,
      campaignId: input.campaignId,
    });
    return ok(res);
  } catch (err) {
    return failFromWriteError<PaymentIntent>(err, empty);
  }
}

/**
 * Buat payment untuk satu order Rate Card lewat Function `create-payment`.
 *
 * `amount` HARUS persis `order.amount` — Rate Card Order adalah seller-side
 * (ADR-008), jadi UMKM membayar harga rate card tanpa tambahan apa pun. Function
 * menolak 409 kalau nominalnya tidak cocok, dan itu memang yang diinginkan.
 *
 * Validasi kepemilikan order, status `pending_payment`, dan kecocokan nominal
 * sudah dikerjakan Function (create-payment:33-42) — sengaja TIDAK diduplikasi
 * di sini, karena versi klien tidak bisa dipercaya dan akan menjadi sumber drift
 * kedua. Yang dikerjakan di sini hanya memetakan errornya ke pesan yang terbaca.
 */
export async function createOrderPaymentInAppwrite(input: {
  orderId: string;
  amount: number;
  finishUrl?: string;
}): Promise<ServiceResult<PaymentIntent>> {
  const empty = null as unknown as PaymentIntent;
  const auth = await requireUserId<PaymentIntent>(empty);
  if (!auth.ok) return auth.result;
  try {
    const res = await executeFunction<PaymentIntent>(FUNCTION_IDS.createPayment, {
      purpose: "order",
      amount: input.amount,
      orderId: input.orderId,
      ...(input.finishUrl && { finishUrl: input.finishUrl }),
    });
    return ok(res);
  } catch (err) {
    return failFromWriteError<PaymentIntent>(err, empty);
  }
}

// ── Alur A: terbitkan campaign & review submission (Sprint 4) ────────────────
//
// Keduanya lewat SDK tulis dokumen, BUKAN executeFunction. `campaign-published`
// dan `calculate-campaign-reward` dipicu event database (lihat `events` di
// 00_BACKEND/appwrite.config.json), jadi menyala sendiri setelah tulisan di
// bawah masuk. Efeknya asinkron — pemanggil tidak boleh menganggap hasilnya
// langsung terlihat.

/**
 * Terbitkan campaign draft → `active`.
 *
 * Mirror 00_BACKEND/src/services/campaign.service.ts:210-240. Guard
 * `remainingBudget > 0` adalah alasan alur ini terblokir sepanjang Sprint 3:
 * kolomnya baru terisi setelah `create-escrow` memproses pembayaran campaign.
 * Karena webhook Midtrans bisa telat beberapa detik, pemanggil harus siap
 * mendapat "belum di-top-up" walau pengguna baru saja membayar.
 */
/**
 * Terbitkan campaign draft menjadi active.
 * Dirutekan lewat patch-campaign-status Cloud Function yang memvalidasi
 * remainingBudget > 0 di sisi server (fix SEC-H1 2026-08-08).
 */
export async function publishCampaignInAppwrite(
  campaignId: string
): Promise<ServiceResult<Campaign>> {
  const empty = null as unknown as Campaign;
  const auth = await requireUserId<Campaign>(empty);
  if (!auth.ok) return auth.result;
  try {
    await executeFunction(FUNCTION_IDS.patchCampaignStatus, { campaignId, action: "publish" });
    // Baca ulang setelah publish
    const res = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("$id", campaignId),
      Query.equal("umkmId", auth.userId),
      Query.limit(1),
    ]);
    const doc = res.documents[0] as unknown as Doc | undefined;
    if (!doc) return fail("Campaign tidak ditemukan setelah diterbitkan.", "not_found", empty);
    return ok(mapCampaign(doc));
  } catch (err) {
    return failFromError<Campaign>(err, empty);
  }
}

export type ReviewSubmissionInput = {
  submissionId: string;
  status: Extract<SubmissionStatus, "approved" | "rejected">;
  notes?: string;
  /**
   * Jumlah views yang diverifikasi UMKM.
   *
   * WAJIB ikut ditulis saat approve. `calculate-campaign-reward:38` menghitung
   * reward dari `campaign_submissions.views`, dan TIDAK ADA satu pun Function
   * backend yang pernah mengisi kolom itu — kalau dibiarkan 0, reward selalu 0
   * dan kreator tidak pernah dibayar. Sudah diangkat ke backend sebagai B-1.
   */
  views: number;
};

/**
 * Setujui / tolak submission kreator.
 *
 * `views` ditulis BERSAMAAN dengan `status` dalam satu updateDocument, bukan
 * dua panggilan terpisah: `calculate-campaign-reward` menyala pada update dan
 * langsung membaca `doc.views`. Kalau views ditulis belakangan, Function sudah
 * terlanjur menghitung reward dari angka lama.
 */
export async function reviewSubmissionInAppwrite(
  input: ReviewSubmissionInput
): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    // `campaign_submissions` dan `campaign_claims` tidak punya update di level
    // koleksi (dicabut Sprint 8 — update("users") berarti siapa pun bisa
    // menyetujui bukti kerja siapa pun lalu mencairkan dananya), dan permission
    // barisnya tidak bisa dipasang kreator untuk UMKM. Jadi kedua update itu
    // dikerjakan Function; kepemilikan lewat campaign induk juga diperiksa
    // di sana, bukan di sini.
    const reviewed = await executeFunction<{ campaignId?: string }>(
      FUNCTION_IDS.reviewSubmission,
      {
        submissionId: input.submissionId,
        status: input.status,
        views: input.status === "approved" ? input.views : undefined,
        ...(input.notes ? { notes: input.notes } : {}),
      }
    );
    const campaignId = str(reviewed?.campaignId);

    // Penghapusan kuota (totalClaims) dipindah ke backend (review-submission)
    // agar atomic dan idempotent.

    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null, undefined, "reviewSubmission");
  }
}

// ── hapus & batalkan (Sprint 3.5) ────────────────────────────────────────────
//
// Dua kelas yang SENGAJA dibedakan — jangan disatukan:
// - HAPUS    : baris benar-benar hilang. Hanya untuk data yang belum mengikat
//              pihak lain (draft campaign, offer pending, aset draft).
// - BATALKAN : baris tetap ada, statusnya berubah. Untuk apa pun yang sudah
//              menyentuh uang atau punya konsekuensi lanjutan (order, payment).
//
// Mirror dari 00_BACKEND/src/services/{campaign,offer,order,payment}.service.ts.
// Frontend TIDAK mengimpor file itu — `00_BACKEND` dikecualikan dari tsconfig
// dan paket npm-nya terpisah. Lihat §3 di integration-context/
// 2026-07-26-review-frontend-atas-delete-layer.md.

/** 401/403 saat menghapus = baris dibuat tanpa Permission.delete, bukan salah user. */
const failDelete = (err: unknown, subject: string): ServiceResult<null> => {
  const code = (err as { code?: number })?.code;
  if (code === 401 || code === 403) {
    return fail(
      `${subject} ini tidak bisa dihapus dari aplikasi karena dibuat sebelum fitur hapus aktif; hubungi support.`,
      "forbidden",
      null
    );
  }
  return failFromWriteError<null>(err, null);
};

/**
 * Hapus campaign berstatus `draft` beserta brief & asetnya.
 *
 * Anak dihapus lebih dulu supaya tidak ada baris yatim bila penghapusan induk
 * gagal — urutan sebaliknya akan meninggalkan brief/aset yang tak terjangkau
 * (keduanya hanya bisa ditemukan lewat `campaignId`).
 * Kegagalan menghapus anak TIDAK membatalkan operasi: induk yang tersisa jauh
 * lebih mengganggu pengguna daripada satu baris brief yatim.
 */
export async function deleteCampaignDraftInAppwrite(
  campaignId: string
): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    const res = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("$id", campaignId),
      Query.equal("umkmId", auth.userId),
      Query.limit(1),
    ]);
    const doc = res.documents[0] as unknown as Doc | undefined;
    if (!doc) return fail("Campaign tidak ditemukan.", "not_found", null);

    if (str(doc.status) !== "draft") {
      return failValidation(
        "Hanya campaign draft yang bisa dihapus. Campaign yang sudah tayang cukup dijeda.",
        null
      );
    }

    for (const collection of [COLLECTIONS.campaignBriefs, COLLECTIONS.campaignAssets]) {
      try {
        const children = await databases.listDocuments(DB, collection, [
          Query.equal("campaignId", campaignId),
          Query.limit(100),
        ]);
        for (const child of children.documents) {
          await databases.deleteDocument(DB, collection, child.$id);
        }
      } catch {
        // Baris anak yatim lebih ringan daripada gagal menghapus induk.
      }
    }

    await databases.deleteDocument(DB, COLLECTIONS.campaigns, campaignId);
    return ok(null);
  } catch (err) {
    return failDelete(err, "Campaign");
  }
}

/**
 * Hapus satu aset campaign. Hanya selama induknya masih `draft` — setelah tayang
 * kreator sudah bisa melihat asetnya, jadi menghapusnya mengubah brief berjalan.
 */
export async function removeCampaignAssetInAppwrite(
  assetId: string
): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    const asset = (await databases.getDocument(
      DB,
      COLLECTIONS.campaignAssets,
      assetId
    )) as unknown as Doc;

    const parent = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("$id", str(asset.campaignId)),
      Query.equal("umkmId", auth.userId),
      Query.limit(1),
    ]);
    const campaign = parent.documents[0] as unknown as Doc | undefined;
    if (!campaign) return fail("Aset tidak ditemukan.", "not_found", null);

    if (str(campaign.status) !== "draft") {
      return failValidation(
        "Aset hanya bisa dihapus selama campaign masih draft.",
        null
      );
    }

    await databases.deleteDocument(DB, COLLECTIONS.campaignAssets, assetId);
    return ok(null);
  } catch (err) {
    return failDelete(err, "Aset");
  }
}

/**
 * Hapus custom offer yang masih `pending`. Setelah `accepted` sudah ada order
 * yang terbentuk darinya, dan `rejected` adalah jejak negosiasi yang berguna.
 */
export async function deleteOfferInAppwrite(offerId: string): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    const res = await databases.listDocuments(DB, COLLECTIONS.offers, [
      Query.equal("$id", offerId),
      Query.equal("umkmId", auth.userId),
      Query.limit(1),
    ]);
    const doc = res.documents[0] as unknown as Doc | undefined;
    if (!doc) return fail("Penawaran tidak ditemukan.", "not_found", null);

    if (str(doc.status) !== "pending") {
      return failValidation(
        "Hanya penawaran yang belum direspons yang bisa dihapus.",
        null
      );
    }

    await databases.deleteDocument(DB, COLLECTIONS.offers, offerId);
    return ok(null);
  } catch (err) {
    return failDelete(err, "Penawaran");
  }
}

/**
 * Batalkan order yang belum dibayar. BUKAN hapus — barisnya tetap ada dengan
 * status `cancelled` supaya riwayat pesanan tetap utuh.
 */
export async function cancelOrderInAppwrite(orderId: string): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    await executeFunction(FUNCTION_IDS.cancelOrder, { orderId });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null);
  }
}

/**
 * Batalkan payment yang belum dibayar lewat Function `cancel-payment`.
 * `payments` hanya punya `read("users")` — tidak ada jalur update dari browser,
 * jadi ini satu-satunya fitur di sprint ini yang wajib lewat Function.
 * Function menegakkan ownership + status `pending` sendiri.
 */
export async function cancelPaymentInAppwrite(paymentId: string): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    await executeFunction(FUNCTION_IDS.cancelPayment, { paymentId });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null);
  }
}

// ---------------------------------------------------------------------------
// Edit draft campaign
// ---------------------------------------------------------------------------

/**
 * Data mentah draft campaign untuk halaman edit wizard.
 * Berbeda dari `CampaignDraftResult` yang memakai mapped type Campaign —
 * field `brief`/`asset` menyimpan nilai DB mentah supaya W14 rehydrate bisa
 * menjalankan `decomposeBriefDetail` tanpa kehilangan data.
 */
export type CampaignEditRaw = {
  campaign: Campaign;
  brief?: {
    id: string;
    briefDetail: string;
    contentAngle: string;
    cta: string;
    objective: string;
    doAndDont: string;
  };
  asset?: {
    id: string;
    fileUrl: string;
    fileName: string;
  };
  warnings: string[];
};

/**
 * Baca campaign draft + brief + asset, ownership-filtered (umkmId = uid, status = draft).
 * Dipakai halaman `/campaign/[id]/edit` untuk seeding wizard state.
 */
export async function getCampaignDraftForEditFromAppwrite(
  campaignId: string
): Promise<ServiceResult<CampaignEditRaw>> {
  const empty = null as unknown as CampaignEditRaw;
  const auth = await requireUserId<CampaignEditRaw>(empty);
  if (!auth.ok) return auth.result;

  try {
    // Guard kepemilikan + status=draft dalam satu query
    const res = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("$id", campaignId),
      Query.equal("umkmId", auth.userId),
      Query.equal("status", "draft"),
      Query.limit(1),
    ]);
    const doc = res.documents[0] as unknown as Doc | undefined;
    if (!doc) return fail("Campaign draft tidak ditemukan atau bukan milik Anda.", "not_found", empty);

    const campaign = mapCampaign(doc);
    const warnings: string[] = [];

    // Baca brief (opsional)
    let brief: CampaignEditRaw["brief"];
    try {
      const briefRes = await databases.listDocuments(DB, COLLECTIONS.campaignBriefs, [
        Query.equal("campaignId", campaignId),
        Query.limit(1),
      ]);
      const bd = briefRes.documents[0] as unknown as Doc | undefined;
      if (bd) {
        brief = {
          id: str(bd.$id),
          briefDetail: str(bd.briefDetail),
          contentAngle: str(bd.contentAngle),
          cta: str(bd.cta),
          objective: str(bd.objective),
          doAndDont: str(bd.doAndDont),
        };
      }
    } catch {
      warnings.push("Brief tidak bisa dimuat — langkah 2 kosong.");
    }

    // Baca asset baris pertama (opsional)
    let asset: CampaignEditRaw["asset"];
    try {
      const assetRes = await databases.listDocuments(DB, COLLECTIONS.campaignAssets, [
        Query.equal("campaignId", campaignId),
        Query.limit(1),
      ]);
      const ad = assetRes.documents[0] as unknown as Doc | undefined;
      if (ad) {
        asset = {
          id: str(ad.$id),
          fileUrl: str(ad.fileUrl),
          fileName: str(ad.fileName),
        };
      }
    } catch {
      warnings.push("Aset tidak bisa dimuat — langkah 3 kosong.");
    }

    return ok<CampaignEditRaw>({ campaign, brief, asset, warnings });
  } catch (err) {
    return failFromError<CampaignEditRaw>(err, empty);
  }
}

/**
 * Update campaign draft yang sudah ada.
 * Guard: campaign harus milik uid + `status === "draft"`.
 * Brief dan asset di-upsert: update baris lama bila ada, buat baru bila belum.
 * Kembalikan `CampaignDraftResult` agar wizard tidak perlu bedakan create vs update.
 */
export async function updateCampaignDraftInAppwrite(
  campaignId: string,
  input: CreateCampaignDraftInput
): Promise<ServiceResult<CampaignDraftResult>> {
  const empty = null as unknown as CampaignDraftResult;
  const auth = await requireUserId<CampaignDraftResult>(empty);
  if (!auth.ok) return auth.result;

  // Update campaign row via patch-campaign-draft Cloud Function (fix SEC-H1 2026-08-08).
  // Baris campaign tidak punya Permission.update dari klien — semua field update
  // disalurkan lewat CF yang memiliki field allowlist ketat (no financial fields).
  let campaignDoc: Doc;
  try {
    await executeFunction(FUNCTION_IDS.patchCampaignDraft, {
      campaignId,
      title: input.title.trim(),
      category: input.category,
      type: input.type,
      description: input.description.trim(),
      budget: input.budget,
      rewardPer1000Views: input.rewardPer1000Views,
      claimLimit: input.claimLimit,
      submissionDays: input.submissionDays ?? 7,
    });
    // Baca ulang untuk dapatkan doc terbaru (CF tidak mereturn doc lengkap)
    const refreshed = await databases.listDocuments(DB, COLLECTIONS.campaigns, [
      Query.equal("$id", campaignId),
      Query.equal("umkmId", auth.userId),
      Query.limit(1),
    ]);
    const d = refreshed.documents[0] as unknown as Doc | undefined;
    if (!d) return fail("Campaign draft tidak ditemukan setelah update.", "not_found", empty);
    campaignDoc = d;
  } catch (err) {
    return failFromError<CampaignDraftResult>(err, empty);
  }

  const warnings: string[] = [];
  const perms = [
    Permission.read(Role.any()),
    Permission.update(Role.user(auth.userId)),
    Permission.delete(Role.user(auth.userId)),
  ];

  // Upsert brief
  if (input.brief) {
    try {
      const briefRes = await databases.listDocuments(DB, COLLECTIONS.campaignBriefs, [
        Query.equal("campaignId", campaignId),
        Query.limit(1),
      ]);
      const existingBrief = briefRes.documents[0] as unknown as Doc | undefined;
      const briefData = {
        objective: input.brief.objective ?? "",
        contentAngle: input.brief.contentAngle,
        cta: input.brief.cta,
        briefDetail: input.brief.briefDetail,
        doAndDont: input.brief.doAndDont ?? "",
        generatedByAi: input.brief.generatedByAi ?? false,
      };
      if (existingBrief) {
        try {
          await databases.updateDocument(DB, COLLECTIONS.campaignBriefs, str(existingBrief.$id), briefData);
        } catch {
          await databases.deleteDocument(DB, COLLECTIONS.campaignBriefs, str(existingBrief.$id));
          await databases.createDocument(DB, COLLECTIONS.campaignBriefs, ID.unique(), { campaignId, ...briefData }, perms);
        }
      } else {
        await databases.createDocument(DB, COLLECTIONS.campaignBriefs, ID.unique(), { campaignId, ...briefData }, perms);
      }
    } catch (err) {
      console.error("[updateCampaignDraft] Failed to update brief:", err);
      warnings.push("Brief belum tersimpan — buka draft untuk melengkapi.");
    }
  }

  // Upsert asset
  if (input.asset) {
    try {
      const assetRes = await databases.listDocuments(DB, COLLECTIONS.campaignAssets, [
        Query.equal("campaignId", campaignId),
        Query.limit(1),
      ]);
      const existingAsset = assetRes.documents[0] as unknown as Doc | undefined;
      const assetData = {
        source: "external",
        type: "link",
        fileUrl: input.asset.fileUrl,
        fileName: input.asset.fileName ?? "Folder Aset Eksternal",
      };
      if (existingAsset) {
        try {
          await databases.updateDocument(DB, COLLECTIONS.campaignAssets, str(existingAsset.$id), assetData);
        } catch {
          await databases.deleteDocument(DB, COLLECTIONS.campaignAssets, str(existingAsset.$id));
          await databases.createDocument(DB, COLLECTIONS.campaignAssets, ID.unique(), { campaignId, ...assetData }, perms);
        }
      } else {
        await databases.createDocument(DB, COLLECTIONS.campaignAssets, ID.unique(), { campaignId, ...assetData }, perms);
      }
    } catch (err) {
      console.error("[updateCampaignDraft] Failed to update asset:", err);
      warnings.push("Tautan aset belum tersimpan — buka draft untuk melengkapi.");
    }
  }

  return ok<CampaignDraftResult>({
    campaign: mapCampaign(campaignDoc),
    complete: warnings.length === 0,
    warnings,
  });
}
