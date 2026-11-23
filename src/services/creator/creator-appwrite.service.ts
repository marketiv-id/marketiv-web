// TODO(fase-07|08): import Appwrite di bawah hanya untuk tulis Fase 7/8
// (offer, klaim, bukti, withdrawal). Tulis Fase 6 sudah lewat Route Handler.
import { Query, ID, Permission, Role } from "appwrite";
import { databases } from "@/lib/appwrite/databases";
import { appwriteConfig } from "@/lib/appwrite/config";
import { uploadPublicFile, FileRuleError, type PublicBucket } from "@/lib/supabase/storage";
import { executeFunction, FUNCTION_IDS } from "@/lib/appwrite/functions";
import { callApi, FunctionExecutionError } from "@/lib/api/call-api";
import { createClient } from "@/lib/supabase/client";
import { rowToDoc, rowsToDocs, type LegacyTableName } from "@/services/shared/legacy-doc";
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
} from "@/services/shared/service-result";
import {
  ServiceResult,
  CreatorProfile,
  CreatorMetric,
  CreatorJob,
  CreatorJobMaterial,
  CreatorPortfolioItem,
  CreatorActiveWork,
  CreatorSubmission,
  CreatorNegotiation,
  CreatorRateCardPackage,
  CreatorTransaction,
  CreatorActivity,
  CreatorActivityType,
  CreatorNiche,
  CampaignStatus,
  ClaimStatus,
  SubmissionStatus,
  FraudStatus,
  RateCardStatus,
  TransactionType,
  TransactionStatus,
} from "@/types/creator-dashboard";

/**
 * Lapisan Appwrite dashboard Kreator (s2-appwrite-read).
 *
 * Sumber kebenaran skema: 00_BACKEND/appwrite.config.json (tables camelCase,
 * KECUALI `conversations` & `messages` yang snake_case).
 * Fase 5 (migrasi Supabase): semua BACA lewat Supabase — query langsung
 * supabase-js + RLS (→ `rowToDoc` → mapper lama) atau Route Handler
 * `/api/creator/*` lewat `callApi`. Fase 6: tulis rate card, profil, akun
 * sosial, portofolio, dan upload publik lewat Route Handler / Supabase Storage.
 * Tulis alur bisnis & uang masih Appwrite sampai Fase 7–8 (`TODO(fase-0x)`).
 *
 * Tiga jenis baca WAJIB lewat Function DTO, bukan query klien:
 * - Profil ....... join creator_profiles + creator_social_accounts + akun Auth.
 * - Metrik ....... agregasi 7 collection; `escrows` & `wallets` tak boleh
 *                  dijumlahkan di klien (08-frontend-data-contract.md §9, §26).
 * - Negosiasi .... join 6 collection, salah satunya `escrows` yang $permissions-nya
 *                  kosong + rowSecurity → tidak terbaca dari browser sama sekali.
 *
 * CATATAN JUJUR (belum bisa runtime-test — NEXT_PUBLIC_USE_MOCK_DATA=true):
 * - `CreatorActiveWork.earnings` & `CreatorSubmission.earnings` dibiarkan kosong.
 *   Rumusnya views/1000 × rewardPer1000Views adalah perhitungan uang, dan §26
 *   melarang klien menghitungnya. Nilai sebenarnya ada di `transactions` sebagai
 *   baris `release` — perlu Function tersendiri bila UI benar-benar butuh angka
 *   per-submission.
 * - `CreatorJob.targetViews`, `productDescription`, `targetAudience`
 *   dan `CreatorActiveWork.rejectedReason` tidak punya kolom
 *   sumber; dibiarkan undefined, bukan diisi tebakan.
 *   (`CreatorJob.thumbnailUrl` & `CreatorActiveWork.thumbnailUrl` kini dipetakan
 *   dari `campaigns.thumbnailUrl` yang sudah ada.)
 * - `CreatorActivity` berasal dari `notifications`, yang baru terbaca setelah
 *   perbaikan permission baris di 4 Function penulis notifikasi dideploy.
 */

const DB = appwriteConfig.databaseId;

const COLLECTIONS = {
  campaigns: "campaigns",
  campaignBriefs: "6ab530d00018edb50097",
  campaignAssets: "campaign_assets",
  claims: "campaign_claims",
  submissions: "campaign_submissions",
  rateCards: "rate_cards",
  rateCardPackages: "rate_card_packages",
  creatorProfiles: "creator_profiles",
  creatorSocialAccounts: "creator_social_accounts",
  creatorPortfolios: "creator_portfolios",
  umkmProfiles: "umkm_profiles",
  transactions: "transactions",
  notifications: "notifications",
  orders: "orders",
  offers: "offers",
} as const;

const PAGE_LIMIT = 100;

/** Harus sinkron dengan CreatorNiche. */
const NICHES = new Set<CreatorNiche>([
  "kuliner",
  "fashion",
  "pariwisata",
  "edukasi",
  "kecantikan",
  "lainnya",
]);

// ── helpers ──────────────────────────────────────────────────────────────────

const orUndefined = (v: string): string | undefined => v || undefined;

const normalizeNiche = (v: unknown): CreatorNiche => {
  const niche = str(v).toLowerCase() as CreatorNiche;
  return NICHES.has(niche) ? niche : "lainnya";
};

/** `campaign_submissions.platform` & `deliverables` hanya mengenal dua platform. */
const asPlatform = (v: unknown): "tiktok" | "instagram" =>
  str(v) === "instagram" ? "instagram" : "tiktok";

/** Deadline submission = tanggal klaim + campaigns.submissionDays. */
function submissionDeadline(claimedAt: string, submissionDays: number): string {
  const claimed = new Date(claimedAt);
  if (Number.isNaN(claimed.getTime()) || submissionDays <= 0) return "";
  claimed.setDate(claimed.getDate() + submissionDays);
  return claimed.toISOString();
}

/**
 * Baca Supabase (Fase 5): browser → supabase-js, dibatasi RLS
 * (supabase/migrations/0011_rls_select.sql). Baris dikembalikan sebagai Doc
 * bergaya Appwrite lewat `rowToDoc()` supaya mapper di bawah tidak berubah.
 *
 * Filter kepemilikan (`creator_id = userId`, dll.) TETAP dipasang walau RLS
 * sudah membatasi: tabel publik (campaigns, profil) tidak di-scope RLS ke
 * pemanggil, dan filter eksplisit menjaga hasil identik dengan versi Appwrite.
 */
const db = () => createClient();

type DbResult = { data: unknown; error: unknown };

/** `{ data, error }` → rows, atau lempar error supabase-js (dipetakan failFromError). */
function rowsOf(res: DbResult): Record<string, unknown>[] {
  if (res.error) throw res.error;
  return (res.data as Record<string, unknown>[] | null) ?? [];
}

/** Padanan `Query.equal(field, ids)` + limit 100 — `.in()` dengan kolom Postgres. */
async function listByIds(table: LegacyTableName, column: string, ids: string[]): Promise<Doc[]> {
  if (ids.length === 0) return [];
  // Nama tabel/kolom dinamis: tipe Database tidak bisa mempersempitnya di sini.
  const query = (db().from(table as "campaigns") as unknown as {
    select: (c: string) => { in: (col: string, v: string[]) => { limit: (n: number) => PromiseLike<DbResult> } };
  })
    .select("*")
    .in(column, ids.slice(0, PAGE_LIMIT))
    .limit(PAGE_LIMIT);
  return rowsToDocs(table, rowsOf(await query));
}

/** Peta userId UMKM → profil, untuk brandName & brandAvatar. */
async function loadUmkmProfiles(umkmIds: string[]): Promise<Map<string, Doc>> {
  const unique = Array.from(new Set(umkmIds.filter(Boolean)));
  const profiles = await listByIds("umkm_profiles", "user_id", unique);
  return new Map(profiles.map((p) => [str(p.userId), p]));
}

// ── mappers ──────────────────────────────────────────────────────────────────

/** `campaigns.platforms` adalah kolom array; nilai non-array diabaikan. */
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((i): i is string => typeof i === "string" && i.length > 0) : [];

/** Nama tampilan materi: fileName, atau host URL bila UMKM tidak mengisinya. */
function materialLabel(d: Doc): string {
  const name = str(d.fileName);
  if (name) return name;
  const url = str(d.fileUrl);
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const mapMaterial = (d: Doc): CreatorJobMaterial => ({
  id: str(d.$id),
  label: materialLabel(d),
  url: str(d.fileUrl),
  kind: str(d.type) === "link" ? "link" : "file",
});

const mapJob = (d: Doc, umkm?: Doc): CreatorJob => ({
  id: str(d.$id),
  title: str(d.title),
  brandName: str(umkm?.businessName),
  brandAvatar: str(umkm?.logoUrl),
  brief: str(d.description),
  niche: normalizeNiche(d.category),
  quota: num(d.claimLimit),
  usedQuota: num(d.totalClaims),
  ratePerThousandViews: num(d.rewardPer1000Views),
  status: str(d.status) as CampaignStatus,
  totalBudget: num(d.budget),
  createdAt: str(d.$createdAt),
  type: str(d.type) || undefined,
  platforms: strList(d.platforms),
  // campaigns.thumbnailUrl (opsional) — "" → undefined, campaign legacy tanpa gambar.
  thumbnailUrl: orUndefined(str(d.thumbnailUrl)),
});

const mapSubmission = (d: Doc): CreatorSubmission => ({
  id: str(d.$id),
  campaignId: str(d.campaignId),
  claimId: str(d.claimId),
  platform: asPlatform(d.platform),
  contentUrl: str(d.postUrl),
  actualViews: num(d.views),
  status: str(d.status) as SubmissionStatus,
  // fraudStatus adalah kolom TERPISAH — jangan digabung ke status.
  fraudStatus: orUndefined(str(d.fraudStatus)) as FraudStatus | undefined,
  submittedAt: str(d.$createdAt),
  validatedAt: str(d.status) === "pending" ? undefined : str(d.$updatedAt),
  // Tidak ada kolom earnings; nilainya hanya ada di ledger `transactions`.
  earnings: 0,
});

/**
 * `notifications.type` yang punya padanan visual dipetakan; sisanya diteruskan
 * apa adanya dan ditampilkan UI sebagai "INFO".
 */
const ACTIVITY_TYPE_ALIAS: Record<string, CreatorActivityType> = {
  // Keuangan
  reward: "payout",
  reward_matured: "payout",
  escrow_released: "payout",
  // Submission
  submission_approved: "submission_valid",
  // Escrow
  escrow_held: "pending_escrow",
  // Negosiasi / Rate Card
  chat_message: "negotiation_new",
  offer_rejected: "negotiation_new",
  order_created: "negotiation_new",
  order_completed: "negotiation_new",
  deliverable_submitted: "negotiation_new",
  revision_requested: "negotiation_new",
  // campaign_published, claim, claim_expired: pass-through (sudah cocok CreatorActivityType)
};

const mapActivity = (d: Doc): CreatorActivity => {
  const raw = str(d.type);
  return {
    id: str(d.$id),
    type: ACTIVITY_TYPE_ALIAS[raw] ?? (raw as CreatorActivityType),
    title: str(d.title),
    description: str(d.message),
    // `notifications` tidak menyimpan nominal — pesannya sudah memuat angka.
    createdAt: str(d.createdAt) || str(d.$createdAt),
  };
};

/** referenceType menentukan asal uang; dipakai untuk label sumber di UI. */
const TRANSACTION_SOURCE: Record<string, CreatorTransaction["source"]> = {
  campaign_submission: "Campaign",
  escrow: "Rate Card",
  withdrawal: "Withdrawal",
};

const TRANSACTION_DESCRIPTION: Record<string, string> = {
  campaign_submission: "Reward campaign",
  escrow: "Pencairan escrow rate card",
  withdrawal: "Penarikan saldo",
};

const mapTransaction = (d: Doc): CreatorTransaction => {
  const referenceType = str(d.referenceType);
  const transactionType = str(d.type) as TransactionType;
  return {
    id: str(d.$id),
    type: transactionType,
    amount: num(d.amount),
    status: str(d.status) as TransactionStatus,
    description:
      transactionType === "withdrawal_reversal"
        ? "Pengembalian saldo penarikan"
        : TRANSACTION_DESCRIPTION[referenceType] ?? str(d.type),
    // `transactions` tidak punya kolom tanggal sendiri.
    createdAt: str(d.$createdAt),
    referenceId: orUndefined(str(d.referenceId)),
    source: TRANSACTION_SOURCE[referenceType],
  };
};

// ── READS via Route Handler (dulu Function DTO) ──────────────────────────────
//
// Route `/api/creator/*` menegakkan kepemilikan sendiri dari sesi cookie
// (`requireUser`), jadi userId TIDAK pernah dikirim dari klien — tidak bisa dipalsukan.

/** Join creator_profiles + creator_social_accounts + akun Auth. */
export async function getCreatorProfileFromAppwrite(): Promise<ServiceResult<CreatorProfile>> {
  try {
    const data = await callApi<CreatorProfile>("creatorProfile");
    return { success: true, data };
  } catch (err) {
    if (err instanceof FunctionExecutionError && (err.statusCode === 404 || err.statusCode >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      try {
        const retryData = await callApi<CreatorProfile>("creatorProfile");
        return { success: true, data: retryData };
      } catch (retryErr) {
        return failFromError<CreatorProfile>(retryErr, null as unknown as CreatorProfile);
      }
    }
    return failFromError<CreatorProfile>(err, null as unknown as CreatorProfile);
  }
}

/** Agregasi campaigns + claims + submissions + orders + escrows + wallets. */
export async function getCreatorMetricsFromAppwrite(): Promise<ServiceResult<CreatorMetric>> {
  try {
    const data = await callApi<CreatorMetric>("creatorDashboardSummary");
    return { success: true, data };
  } catch (err) {
    return failFromError<CreatorMetric>(err, null as unknown as CreatorMetric);
  }
}

/**
 * Join conversations + offers + orders + escrows + messages + umkm_profiles.
 * Di-key conversationId — di Alur B order lahir paling akhir.
 */
export async function getCreatorNegotiationsFromAppwrite(): Promise<ServiceResult<CreatorNegotiation[]>> {
  try {
    const data = await callApi<CreatorNegotiation[]>("creatorNegotiations");
    return { success: true, data };
  } catch (err) {
    return failFromError<CreatorNegotiation[]>(err, []);
  }
}

export async function getCreatorNegotiationByIdFromAppwrite(
  conversationId: string
): Promise<ServiceResult<CreatorNegotiation>> {
  try {
    const data = await callApi<CreatorNegotiation>("creatorNegotiations", { conversationId });
    return { success: true, data };
  } catch (err) {
    if (err instanceof FunctionExecutionError && err.code === "not_found") {
      return { success: false, data: null, error: "Negosiasi tidak ditemukan", code: "not_found" };
    }
    return failFromError<CreatorNegotiation>(err, null as unknown as CreatorNegotiation);
  }
}

/**
 * Terima / tolak Custom Offer. Ini SATU-SATUNYA aksi kreator terhadap offer —
 * membuat offer adalah hak UMKM (docs/02_Modules/Offers/30_Business_Rules.md:13),
 * dan permission baris offer memang hanya memberi kreator `update`.
 *
 * ⚠️ ORDER TIDAK DIBUAT DI SINI. `create-order` dipicu event
 * `offers.rows.*.update` dan berjalan ASINKRON — beberapa detik setelah tulisan
 * ini masuk. Pemanggil harus mem-poll, bukan menganggap ordernya langsung ada.
 * Membuat order dari klien juga akan ditolak: `orders` punya `$permissions`
 * kosong, hanya Function yang bisa menulis ke sana.
 */
// TODO(fase-07): terima/tolak offer → Route Handler + RPC (offer → order).
async function setOfferStatusInAppwrite(
  offerId: string,
  status: "accepted" | "rejected"
): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    const offer = (await databases.getDocument(DB, COLLECTIONS.offers, offerId)) as unknown as Doc;

    if (str(offer.creatorId) !== auth.userId) {
      return fail("Hanya kreator penerima yang dapat menjawab penawaran ini.", "forbidden", null);
    }
    if (str(offer.status) !== "pending") {
      return fail("Penawaran ini sudah dijawab sebelumnya.", "validation", null);
    }

    await databases.updateDocument(DB, COLLECTIONS.offers, offerId, { status });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null);
  }
}

export const acceptOfferInAppwrite = (offerId: string) =>
  setOfferStatusInAppwrite(offerId, "accepted");

export const rejectOfferInAppwrite = (offerId: string) =>
  setOfferStatusInAppwrite(offerId, "rejected");

// ── READS query langsung ─────────────────────────────────────────────────────

/**
 * Job Pool publik: semua campaign `active`, bukan hanya milik kreator ini.
 * RLS `campaigns`: status <> 'draft' terbaca semua user login.
 */
export async function getCreatorJobsFromAppwrite(): Promise<ServiceResult<CreatorJob[]>> {
  const auth = await requireUserId<CreatorJob[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const docs = rowsToDocs(
      "campaigns",
      rowsOf(
        await db()
          .from("campaigns")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(PAGE_LIMIT)
      )
    );
    const umkmById = await loadUmkmProfiles(docs.map((d) => str(d.umkmId)));
    return { success: true, data: docs.map((d) => mapJob(d, umkmById.get(str(d.umkmId)))) };
  } catch (err) {
    return failFromError<CreatorJob[]>(err, []);
  }
}

/** Detail Job Pool: campaign + brief + aset. Ketiganya read("any"). */
export async function getCreatorJobByIdFromAppwrite(id: string): Promise<ServiceResult<CreatorJob>> {
  const auth = await requireUserId<CreatorJob>(null as unknown as CreatorJob);
  if (!auth.ok) return auth.result;
  try {
    const res = await db()
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (res.error) throw res.error;
    if (!res.data) {
      return { success: false, data: null, error: "Job tidak ditemukan", code: "not_found" };
    }
    const doc = rowToDoc("campaigns", res.data);

    const [briefs, assets, umkmById] = await Promise.all([
      listByIds("campaign_briefs", "campaign_id", [id]),
      listByIds("campaign_assets", "campaign_id", [id]),
      loadUmkmProfiles([str(doc.umkmId)]),
    ]);

    const brief = briefs[0];
    const job: CreatorJob = {
      ...mapJob(doc, umkmById.get(str(doc.umkmId))),
      contentInstruction: orUndefined(str(brief?.briefDetail)),
      ctaInstruction: orUndefined(str(brief?.cta)),
      targetAudience: orUndefined(str(brief?.objective)),
      doAndDont: parseDoAndDont(brief?.doAndDont),
      externalAssetUrl: orUndefined(str(assets[0]?.fileUrl)),
      materials: assets.map(mapMaterial),
    };
    return { success: true, data: job };
  } catch (err) {
    return failFromError<CreatorJob>(err, null as unknown as CreatorJob);
  }
}

/**
 * `campaign_briefs.doAndDont` dulu JSON string; kini jsonb yang di-stringify
 * ulang oleh `rowToDoc()`, jadi parser ini tetap berlaku.
 */
function parseDoAndDont(value: unknown): CreatorJob["doAndDont"] {
  const raw = str(value);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { do?: unknown; dont?: unknown };
    const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((i) => typeof i === "string") : []);
    return { do: list(parsed.do), dont: list(parsed.dont) };
  } catch {
    return undefined;
  }
}

export async function getCreatorActiveWorksFromAppwrite(): Promise<ServiceResult<CreatorActiveWork[]>> {
  const auth = await requireUserId<CreatorActiveWork[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const claims = await listOwnClaims(auth.userId);
    if (claims.length === 0) return { success: true, data: [] };
    return { success: true, data: await buildActiveWorks(claims) };
  } catch (err) {
    return failFromError<CreatorActiveWork[]>(err, []);
  }
}

export async function getCreatorActiveWorkByIdFromAppwrite(
  id: string
): Promise<ServiceResult<CreatorActiveWork>> {
  const auth = await requireUserId<CreatorActiveWork>(null as unknown as CreatorActiveWork);
  if (!auth.ok) return auth.result;
  try {
    // creatorId ikut sebagai filter, jadi klaim kreator lain tidak pernah terbaca
    // walaupun claimId-nya ditebak.
    const res = await db()
      .from("campaign_claims")
      .select("*")
      .eq("id", id)
      .eq("creator_id", auth.userId)
      .limit(1)
      .maybeSingle();
    if (res.error) throw res.error;
    if (!res.data) {
      return { success: false, data: null, error: "Pekerjaan tidak ditemukan", code: "not_found" };
    }
    const works = await buildActiveWorks([rowToDoc("campaign_claims", res.data)]);
    return { success: true, data: works[0] };
  } catch (err) {
    return failFromError<CreatorActiveWork>(err, null as unknown as CreatorActiveWork);
  }
}

async function listOwnClaims(userId: string): Promise<Doc[]> {
  return rowsToDocs(
    "campaign_claims",
    rowsOf(
      await db()
        .from("campaign_claims")
        .select("*")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT)
    )
  );
}

/** Gabungkan klaim dengan campaign induk, profil UMKM, dan submission-nya. */
async function buildActiveWorks(claims: Doc[]): Promise<CreatorActiveWork[]> {
  const campaignIds = Array.from(new Set(claims.map((c) => str(c.campaignId)).filter(Boolean)));
  const claimIds = claims.map((c) => str(c.$id));

  const [campaigns, submissions, assets] = await Promise.all([
    listByIds("campaigns", "id", campaignIds),
    listByIds("campaign_submissions", "claim_id", claimIds),
    listByIds("campaign_assets", "campaign_id", campaignIds),
  ]);

  const campaignById = new Map(campaigns.map((c) => [str(c.$id), c]));
  const submissionByClaimId = new Map(submissions.map((s) => [str(s.claimId), s]));
  // Materi pertama per campaign — tombol "Buka Materi" hanya butuh satu tautan.
  const assetUrlByCampaignId = new Map<string, string>();
  for (const asset of assets) {
    const campaignId = str(asset.campaignId);
    if (campaignId && !assetUrlByCampaignId.has(campaignId)) {
      assetUrlByCampaignId.set(campaignId, str(asset.fileUrl));
    }
  }
  const umkmById = await loadUmkmProfiles(campaigns.map((c) => str(c.umkmId)));

  return claims.map((claim) => {
    const campaign = campaignById.get(str(claim.campaignId));
    const umkm = campaign ? umkmById.get(str(campaign.umkmId)) : undefined;
    const submission = submissionByClaimId.get(str(claim.$id));
    const claimedAt = str(claim.claimedAt) || str(claim.$createdAt);

    const campaignPlatforms = strList(campaign?.platforms);
    const campaignPlatform = campaignPlatforms.length > 0 ? asPlatform(campaignPlatforms[0]) : "tiktok";
    const resolvedPlatform = submission?.platform ? asPlatform(submission.platform) : campaignPlatform;

    const viewsFinal = Boolean(submission?.views_final || submission?.viewsFinal);
    const lockedViewsNum = submission ? (num(submission.views_count) || num(submission.viewsCount)) : undefined;
    const actualViews = submission
      ? (viewsFinal && lockedViewsNum !== undefined && lockedViewsNum > 0 ? lockedViewsNum : num(submission.views))
      : undefined;

    return {
      id: str(claim.$id),
      campaignId: str(claim.campaignId),
      title: str(campaign?.title),
      brandName: str(umkm?.businessName),
      brandAvatar: str(umkm?.logoUrl),
      brief: str(campaign?.description),
      ratePerThousandViews: num(campaign?.rewardPer1000Views),
      status: str(claim.status) as ClaimStatus,
      claimedAt,
      deadline: submissionDeadline(claimedAt, num(campaign?.submissionDays)),
      submissionId: submission ? str(submission.$id) : undefined,
      submissionStatus: submission ? (str(submission.status) as SubmissionStatus) : undefined,
      // Hasil ai-fraud-precheck — terpisah dari submissionStatus.
      fraudStatus: submission ? (orUndefined(str(submission.fraudStatus)) as FraudStatus | undefined) : undefined,
      contentUrl: submission ? orUndefined(str(submission.postUrl)) : undefined,
      actualViews,
      platform: resolvedPlatform,
      notes: submission ? orUndefined(str(submission.caption)) : undefined,
      submittedAt: submission ? str(submission.$createdAt) : undefined,
      validatedAt:
        submission && str(submission.status) !== "pending" ? str(submission.$updatedAt) : undefined,
      rejectedReason: submission ? orUndefined(str(submission.reviewNotes)) : undefined,
      assetUrl: orUndefined(assetUrlByCampaignId.get(str(claim.campaignId)) ?? ""),
      thumbnailUrl: orUndefined(str(campaign?.thumbnailUrl)),
      viewsCount: lockedViewsNum,
      viewsCapturedAt: submission ? orUndefined(str(submission.views_captured_at || submission.viewsCapturedAt)) : undefined,
      viewsSource: submission ? orUndefined(str(submission.views_source || submission.viewsSource)) : undefined,
      viewsFinal,
    };
  });
}

export async function getCreatorSubmissionsFromAppwrite(): Promise<ServiceResult<CreatorSubmission[]>> {
  const auth = await requireUserId<CreatorSubmission[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const rows = rowsOf(
      await db()
        .from("campaign_submissions")
        .select("*")
        .eq("creator_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT)
    );
    return { success: true, data: rowsToDocs("campaign_submissions", rows).map(mapSubmission) };
  } catch (err) {
    return failFromError<CreatorSubmission[]>(err, []);
  }
}

/**
 * View pemilik: rate card `draft` IKUT ditampilkan. Bedanya dengan
 * getCreatorRateCardsFromAppwrite di sisi UMKM yang hanya `published`.
 */
export async function getCreatorPortfolioFromAppwrite(): Promise<
  ServiceResult<CreatorPortfolioItem[]>
> {
  const auth = await requireUserId<CreatorPortfolioItem[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const docs = rowsToDocs(
      "creator_portfolios",
      rowsOf(
        await db()
          .from("creator_portfolios")
          .select("*")
          .eq("creator_id", auth.userId)
          .order("created_at", { ascending: false })
          .limit(PAGE_LIMIT)
      )
    );
    // platform/niche/views sengaja tidak diisi — tidak ada kolomnya di skema.
    const data: CreatorPortfolioItem[] = docs.map((d) => ({
      id: str(d.$id),
      title: str(d.title),
      url: str(d.portfolioUrl),
      description: str(d.description),
      thumbnailUrl: orUndefined(str(d.thumbnailUrl)),
    }));
    return { success: true, data };
  } catch (err) {
    return failFromError<CreatorPortfolioItem[]>(err, []);
  }
}

export async function getCreatorRateCardPackagesFromAppwrite(): Promise<
  ServiceResult<CreatorRateCardPackage[]>
> {
  const auth = await requireUserId<CreatorRateCardPackage[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const cardDocs = rowsToDocs(
      "rate_cards",
      rowsOf(await db().from("rate_cards").select("*").eq("creator_id", auth.userId).limit(PAGE_LIMIT))
    );
    if (cardDocs.length === 0) return { success: true, data: [] };

    // Status ada di parent `rate_cards`, paketnya di `rate_card_packages`.
    const statusByCard = new Map(
      cardDocs.map((c) => [str(c.$id), str(c.status) as RateCardStatus])
    );
    const packages = await listByIds("rate_card_packages", "rate_card_id", Array.from(statusByCard.keys()));

    const data: CreatorRateCardPackage[] = packages.map((p) => ({
      id: str(p.$id),
      rateCardId: str(p.rateCardId),
      name: str(p.name),
      description: str(p.description),
      price: num(p.price),
      deliverable: str(p.output),
      estimatedDays: num(p.deliveryDays),
      status: statusByCard.get(str(p.rateCardId)) ?? "draft",
      revisionCount: num(p.revisionLimit),
      // Tidak ada kolom platform di rate_card_packages.
    }));
    return { success: true, data };
  } catch (err) {
    return failFromError<CreatorRateCardPackage[]>(err, []);
  }
}

/**
 * Sumbernya HANYA `transactions`. Withdrawal sudah punya baris ledger sendiri
 * (wallet.service.ts menulis withdrawals + transactions sekaligus), jadi membaca
 * `withdrawals` juga akan menghitung penarikan dua kali.
 */
export async function getCreatorTransactionsFromAppwrite(): Promise<ServiceResult<CreatorTransaction[]>> {
  const auth = await requireUserId<CreatorTransaction[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const rows = rowsOf(
      await db()
        .from("transactions")
        .select("*")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT)
    );
    return { success: true, data: rowsToDocs("transactions", rows).map(mapTransaction) };
  } catch (err) {
    return failFromError<CreatorTransaction[]>(err, []);
  }
}

export async function getCreatorActivitiesFromAppwrite(): Promise<ServiceResult<CreatorActivity[]>> {
  const auth = await requireUserId<CreatorActivity[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const rows = rowsOf(
      await db()
        .from("notifications")
        .select("*")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT)
    );
    return { success: true, data: rowsToDocs("notifications", rows).map(mapActivity) };
  } catch (err) {
    return failFromError<CreatorActivity[]>(err, []);
  }
}

// ── rate card CRUD (Sprint 3 → Fase 6: Route Handler) ────────────────────────
//
// Model 1 rate_cards per paket UI (1:1): status ada di parent, toggle per paket
// jalan tanpa restrukturisasi, dan update TIDAK pernah delete-recreate sibling
// (orders.package_id stabil). Semua tulis lewat `/api/rate-cards/**`; parent +
// paket dibuat/diubah/dihapus atomik di RPC 0020 (batas 3 paket, tolak hapus
// bila ada order berjalan — dulu dicek dari browser).

export type RateCardPackageWriteInput = {
  name: string;
  description: string;
  output: string;
  deliveryDays: number;
  price: number;
  revisionLimit: number;
  /** → rate_cards.status */
  published: boolean;
};

export async function createCreatorRateCardPackageInAppwrite(
  input: RateCardPackageWriteInput
): Promise<ServiceResult<CreatorRateCardPackage>> {
  const empty = null as unknown as CreatorRateCardPackage;
  const auth = await requireUserId<CreatorRateCardPackage>(empty);
  if (!auth.ok) return auth.result;
  try {
    return ok(await callApi<CreatorRateCardPackage>("createRateCard", input));
  } catch (err) {
    return failFromWriteError<CreatorRateCardPackage>(err, empty);
  }
}

export async function updateCreatorRateCardPackageInAppwrite(
  pkg: { id: string; rateCardId: string },
  input: RateCardPackageWriteInput
): Promise<ServiceResult<CreatorRateCardPackage>> {
  const empty = null as unknown as CreatorRateCardPackage;
  const auth = await requireUserId<CreatorRateCardPackage>(empty);
  if (!auth.ok) return auth.result;
  try {
    return ok(
      await callApi<CreatorRateCardPackage>("updateRateCardPackage", {
        ...input,
        rateCardId: pkg.rateCardId,
        packageId: pkg.id,
      })
    );
  } catch (err) {
    return failFromWriteError<CreatorRateCardPackage>(err, empty);
  }
}

export async function setCreatorRateCardPackageStatusInAppwrite(
  pkg: { id: string; rateCardId: string },
  status: RateCardStatus
): Promise<ServiceResult<CreatorRateCardPackage>> {
  const empty = null as unknown as CreatorRateCardPackage;
  const auth = await requireUserId<CreatorRateCardPackage>(empty);
  if (!auth.ok) return auth.result;
  try {
    return ok(
      await callApi<CreatorRateCardPackage>("updateRateCard", {
        rateCardId: pkg.rateCardId,
        packageId: pkg.id,
        status,
      })
    );
  } catch (err) {
    return failFromWriteError<CreatorRateCardPackage>(err, empty);
  }
}

export async function deleteCreatorRateCardPackageInAppwrite(pkg: {
  id: string;
  rateCardId: string;
}): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    // Model 1:1 — hapus seluruh rate card (paket ikut). 409 bila ada order berjalan.
    await callApi("deleteRateCard", { rateCardId: pkg.rateCardId });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null);
  }
}

// ── profil kreator (Sprint 3 → Fase 6: PATCH /api/profile) ───────────────────

/**
 * Kolom `creator_profiles` yang boleh dikirim ke `PATCH /api/profile`.
 * `isProfileCompleted` TIDAK ada — flag hanya dihitung server-side.
 */
const CREATOR_PROFILE_WRITABLE = [
  "displayName",
  "bio",
  "city",
  "avatarUrl",
  "bannerUrl",
  "niche",
] as const;

export type CreatorProfileWriteInput = Partial<
  Record<(typeof CREATOR_PROFILE_WRITABLE)[number], string>
>;

/**
 * Update profil kreator lewat `PATCH /api/profile` lalu baca ulang DTO
 * gabungan agar UI mendapat bentuk CreatorProfile yang sama seperti saat load.
 */
export async function updateCreatorProfileInAppwrite(
  input: CreatorProfileWriteInput
): Promise<ServiceResult<CreatorProfile>> {
  const empty = null as unknown as CreatorProfile;
  const auth = await requireUserId<CreatorProfile>(empty);
  if (!auth.ok) return auth.result;

  const payload: Record<string, string> = {};
  for (const key of CREATOR_PROFILE_WRITABLE) {
    const value = input[key];
    if (value !== undefined) payload[key] = value;
  }
  if (Object.keys(payload).length === 0) {
    return failValidation("Tidak ada perubahan untuk disimpan.", empty);
  }

  try {
    await callApi("updateProfile", payload);
    return getCreatorProfileFromAppwrite();
  } catch (err) {
    return failFromWriteError<CreatorProfile>(err, empty);
  }
}

/** Unggah ke bucket publik Supabase (folder milik sendiri) dan kembalikan URL publiknya. */
async function uploadToPublicBucket(target: PublicBucket, file: File): Promise<ServiceResult<string>> {
  const auth = await requireUserId<string>("");
  if (!auth.ok) return auth.result;
  try {
    const uploaded = await uploadPublicFile(target, file, auth.userId);
    return ok(uploaded.url);
  } catch (err) {
    if (err instanceof FileRuleError) return failValidation(err.message, "");
    return failFromWriteError<string>(err, "");
  }
}

/** Unggah avatar ke bucket `avatars` dan kembalikan URL-nya. */
export async function uploadCreatorAvatarInAppwrite(file: File): Promise<ServiceResult<string>> {
  return uploadToPublicBucket("avatars", file);
}

/** Unggah banner ke bucket `creator-banners` dan kembalikan URL-nya. */
export async function uploadCreatorBannerInAppwrite(file: File): Promise<ServiceResult<string>> {
  return uploadToPublicBucket("creatorBanners", file);
}

// ── akun sosial kreator (Sprint 3 → Fase 6: PUT /api/creator/social-accounts) ─

/**
 * Upsert akun sosial pada unique `(creator_id, platform)` di server.
 * `followers` adalah input manual kreator. Opsional: kalau tidak dikirim, nilai
 * lama dibiarkan apa adanya.
 */
export async function upsertCreatorSocialAccountInAppwrite(input: {
  platform: "tiktok";
  username: string;
  followers?: number;
}): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;

  if (input.followers !== undefined && (!Number.isInteger(input.followers) || input.followers < 0)) {
    return failValidation("Jumlah followers harus angka bulat 0 atau lebih.", null);
  }

  try {
    await callApi("upsertSocialAccount", {
      platform: input.platform,
      username: input.username,
      ...(input.followers !== undefined ? { followers: input.followers } : {}),
    });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null);
  }
}

// ── portofolio kreator (Sprint 3 → Fase 6: /api/creator/portfolios) ─────────

export type CreatorPortfolioWriteInput = {
  title: string;
  portfolioUrl: string;
  description?: string;
  thumbnailUrl?: string;
};

export async function createCreatorPortfolioInAppwrite(
  input: CreatorPortfolioWriteInput
): Promise<ServiceResult<CreatorPortfolioItem>> {
  const empty = null as unknown as CreatorPortfolioItem;
  const auth = await requireUserId<CreatorPortfolioItem>(empty);
  if (!auth.ok) return auth.result;
  try {
    return ok(await callApi<CreatorPortfolioItem>("createPortfolio", input));
  } catch (err) {
    return failFromWriteError<CreatorPortfolioItem>(err, empty);
  }
}

export async function updateCreatorPortfolioInAppwrite(
  id: string,
  input: CreatorPortfolioWriteInput
): Promise<ServiceResult<CreatorPortfolioItem>> {
  const empty = null as unknown as CreatorPortfolioItem;
  const auth = await requireUserId<CreatorPortfolioItem>(empty);
  if (!auth.ok) return auth.result;
  try {
    return ok(await callApi<CreatorPortfolioItem>("updatePortfolio", { ...input, portfolioId: id }));
  } catch (err) {
    return failFromWriteError<CreatorPortfolioItem>(err, empty);
  }
}

export async function deleteCreatorPortfolioInAppwrite(id: string): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    await callApi("deletePortfolio", { portfolioId: id });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null);
  }
}

/** Unggah thumbnail portofolio ke bucket `portfolios` (50 MB). */
export async function uploadCreatorPortfolioThumbnailInAppwrite(
  file: File
): Promise<ServiceResult<string>> {
  return uploadToPublicBucket("portfolios", file);
}

// ── penarikan saldo (Sprint 3) ───────────────────────────────────────────────

export type WithdrawRequestInput = {
  amount: number;
  payoutMethod: "bank" | "ewallet";
  providerName: string;
  accountNumber: string;
  accountName: string;
  /** Kunci idempotensi; Function memakainya sebagai document id deterministik. */
  requestKey: string;
};

export type WithdrawalReceipt = {
  withdrawalId: string;
  amount: number;
  status: "requested";
  requestedAt: string;
  balanceAfter: number;
  transactionId: string | null;
};

/**
 * Ajukan penarikan lewat Function `request-withdrawal`.
 * WAJIB lewat Function: `wallets` & `transactions` punya $permissions kosong,
 * jadi klien tak bisa mendebit saldo sendiri.
 */
// TODO(fase-08): penarikan → Route Handler + RPC uang.
export async function requestWithdrawalInAppwrite(
  input: WithdrawRequestInput
): Promise<ServiceResult<WithdrawalReceipt>> {
  const empty = null as unknown as WithdrawalReceipt;
  const auth = await requireUserId<WithdrawalReceipt>(empty);
  if (!auth.ok) return auth.result;
  try {
    const res = await executeFunction<WithdrawalReceipt>(FUNCTION_IDS.requestWithdrawal, input);
    return ok(res);
  } catch (err) {
    return failFromWriteError<WithdrawalReceipt>(err, empty);
  }
}

// ── Alur A: klaim campaign & kirim bukti (Sprint 4) ──────────────────────────
//
// `claimCampaign` masih membuat baris claim langsung dari klien; event
// `campaign-claimed` menangani counter/notifikasi setelahnya.
//
// `campaign-claimed` SEKARANG menambah `totalClaims` secara atomik. Klien hanya
// membuat baris claim — counter adalah tanggung jawab Function. Sweep basi
// sisi klien juga dihapus: slot dikembalikan oleh `expire-stale-claims` (cron
// per jam) dan oleh `campaign-claimed` sendiri saat kuota terlampaui.

/**
 * Klaim campaign aktif.
 *
 * Mirror 00_BACKEND/src/services/claim.service.ts:83-160 dengan dua
 * penyimpangan yang disengaja:
 *
 * 1. **`isProfileCompleted` dibaca dari `creator_profiles`, bukan `users`.**
 *    Backend membacanya dari `users` (claim.service.ts:91) padahal koleksi itu
 *    hanya punya kolom userId/role/status/email/phone/createdAt — `users` tidak
 *    pernah punya `isProfileCompleted`. Kolomnya ada di `creator_profiles`.
 *    Sudah dilaporkan ke backend.
 * 2. **Permission.delete tetap dipasang untuk kompatibilitas baris lama/UI.**
 *    Unclaim runtime sekarang lewat Function trusted; browser tidak lagi
 *    menghapus claim atau memutasi totalClaims.
 */
// TODO(fase-07): klaim campaign (termasuk pra-cek baca) → Route Handler + RPC.
export async function claimCampaignInAppwrite(
  campaignId: string
): Promise<ServiceResult<string>> {
  const auth = await requireUserId<string>("");
  if (!auth.ok) return auth.result;
  try {
    const campaign = (await databases.getDocument(
      DB,
      COLLECTIONS.campaigns,
      campaignId
    )) as unknown as Doc;

    if (str(campaign.status) !== "active") {
      return failValidation("Campaign ini sudah tidak aktif.", "");
    }

    const profileRes = await databases.listDocuments(DB, COLLECTIONS.creatorProfiles, [
      Query.equal("userId", auth.userId),
      Query.limit(1),
    ]);
    const profile = profileRes.documents[0] as unknown as Doc | undefined;
    if (!profile || !profile.isProfileCompleted) {
      return failValidation(
        "Lengkapi profil kreator dulu sebelum mengambil pekerjaan.",
        ""
      );
    }

    // Guard cepat berbasis bacaan — mungkin basi (counter diperbarui oleh
    // `campaign-claimed` async, ~0,5–3 detik setelah createDocument). Tetap
    // berguna sebagai penolakan dini untuk kasus yang jelas-jelas penuh.
    // Penegakan final ada di `campaign-claimed` yang memakai incrementColumn
    // dengan `max: claimLimit` — server yang benar-benar menolak bila sudah penuh.
    if (num(campaign.totalClaims) >= num(campaign.claimLimit)) {
      return failValidation("Kuota kreator untuk campaign ini sudah penuh.", "");
    }

    // Claim expired adalah riwayat, bukan claim aktif. Selaras dengan backend
    // claim.service.ts: klaim non-expired tetap menghalangi duplikasi.
    const existing = await databases.listDocuments(DB, COLLECTIONS.claims, [
      Query.equal("campaignId", campaignId),
      Query.equal("creatorId", auth.userId),
      Query.notEqual("status", "expired"),
      Query.limit(1),
    ]);
    if (existing.documents.length > 0) {
      return failValidation("Kamu sudah pernah mengambil campaign ini.", "");
    }

    const claim = await databases.createDocument(
      DB,
      COLLECTIONS.claims,
      ID.unique(),
      {
        campaignId,
        creatorId: auth.userId,
        status: "claimed",
        claimedAt: new Date().toISOString(),
      },
      // HANYA role diri sendiri. Appwrite menolak klien yang memasang permission
      // untuk user lain ("Permissions must be one of: (any, users, user:<diri
      // sendiri>, ...)"), jadi dua baris untuk UMKM yang sempat ada di sini
      // membuat klaim campaign gagal total — bukan sekadar tidak berefek.
      //
      // UMKM tetap bisa membaca klaim ini lewat `read("any")` yang masih
      // terpasang di level koleksi `campaign_claims`, dan update statusnya
      // dikerjakan Function `review-submission` dengan API key.
      [
        Permission.read(Role.user(auth.userId)),
        Permission.update(Role.user(auth.userId)),
        Permission.delete(Role.user(auth.userId)),
      ]
    );

    // `campaign-claimed` event Function adalah satu-satunya authority +1.
    // createDocument sukses belum berarti claim permanen: event asinkron dapat
    // mengubahnya menjadi expired bila kuota ternyata sudah penuh.

    return ok(claim.$id);
  } catch (err) {
    return failFromWriteError<string>(err, "");
  }
}

export type SubmitProofInput = {
  claimId: string;
  campaignId: string;
  postUrl: string;
  caption?: string;
  /** Platform konten — diteruskan ke Appwrite supaya ai-fraud-precheck
   *  membandingkan hostname URL dengan platform yang benar, bukan selalu "tiktok". */
  platform: "tiktok" | "instagram";
};

/**
 * Kirim bukti konten untuk claim yang sedang dikerjakan.
 *
 * Jalur ini sekarang lewat Function `submit-campaign-proof`, bukan direct
 * `createDocument`, agar browser tidak lagi tergantung shape schema Appwrite
 * live (`creatorId` vs `creator_id`, dst.) dan backend menjadi satu-satunya
 * titik translasi kontrak.
 */
// TODO(fase-07): kirim bukti (termasuk pra-cek baca claim) → Route Handler.
export async function submitProofInAppwrite(
  input: SubmitProofInput
): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    const res = await databases.listDocuments(DB, COLLECTIONS.claims, [
      Query.equal("$id", input.claimId),
      Query.equal("creatorId", auth.userId),
      Query.limit(1),
    ]);
    const claim = res.documents[0] as unknown as Doc | undefined;
    if (!claim) return fail("Pekerjaan tidak ditemukan.", "not_found", null);

    if (str(claim.status) !== "claimed") {
      return failValidation(
        "Bukti untuk pekerjaan ini sudah pernah dikirim.",
        null
      );
    }

    if (str(claim.campaignId) !== input.campaignId) {
      return failValidation("Claim tidak cocok dengan campaign yang dipilih.", null);
    }

    await executeFunction(FUNCTION_IDS.submitCampaignProof, input);

    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null);
  }
}

// ── batalkan claim (Sprint 3.5) ──────────────────────────────────────────────

/**
 * Batalkan claim campaign yang belum disubmit — HARD DELETE.
 *
 * Mirror 00_BACKEND/src/services/claim.service.ts:unclaimCampaign setelah
 * resolusi T-1 (2026-07-26): backend memilih menghapus barisnya, bukan
 * memindahkan status ke `unclaimed`. Itu satu-satunya cara kreator bisa
 * mengambil campaign yang sama lagi, karena cek duplikat di `claimCampaign`
 * menolak berdasarkan keberadaan baris tanpa memfilter status.
 *
 * Runtime unclaim dikerjakan `unclaim-campaign` Function. Function memverifikasi
 * caller/owner/status, menghapus baris, lalu menurunkan counter atomik. Bila
 * counter gagal, Function berusaha memulihkan claim dan tidak membalas sukses.
 */
// TODO(fase-07): batalkan claim → Route Handler + RPC.
export async function unclaimCampaignInAppwrite(claimId: string): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    const result = await executeFunction<{ success?: unknown; claimId?: unknown }>(
      FUNCTION_IDS.unclaimCampaign,
      { claimId },
    );
    if (result?.success !== true || typeof result.claimId !== "string") {
      return fail("Respons pembatalan claim tidak valid.", "server", null);
    }
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null);
  }
}
