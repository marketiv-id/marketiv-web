/**
 * Tipe view-model dashboard UMKM.
 *
 * Semua nilai status di-reexport dari kanon `@/types/domain` — jangan
 * mendefinisikan ulang union status di file ini.
 */
export type {
  ServiceResult,
  ServiceErrorCode,
  CampaignStatus,
  SubmissionStatus,
  FraudStatus,
  TransactionStatus,
  TransactionType,
  OrderStatus,
  OfferStatus,
  EscrowStatus,
  NegotiationStage,
  DeliverableSource,
  DeliverableStatus,
  RevisionStatus,
  MessageType,
  RateCardStatus,
} from "./domain";

import type {
  CampaignStatus,
  SubmissionStatus,
  FraudStatus,
  TransactionStatus,
  TransactionType,
  OrderStatus,
  OfferStatus,
  EscrowStatus,
  NegotiationStage,
  DeliverableSource,
  DeliverableStatus,
  RevisionStatus,
  MessageType,
  RateCardStatus,
} from "./domain";

export type CreatorNiche =
  | "kuliner"
  | "fashion"
  | "pariwisata"
  | "edukasi"
  | "kecantikan"
  | "lainnya";

export interface UmkmProfile {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  whatsappNumber: string;
  location: string;
  avatarUrl: string;
  isVerified: boolean;
}

/**
 * Baris `umkm_profiles` mentah untuk halaman Pengaturan — DTO get-umkm-profile
 * tidak mengembalikan category/description/address/tiktok yang form butuh.
 * `docId` = $id dokumen, dibutuhkan updateDocument.
 */
export interface UmkmSettingsProfile {
  docId: string;
  userId: string;
  businessName: string;
  category: string;
  description: string;
  city: string;
  address: string;
  tiktok: string;
  logoUrl: string;
  isProfileCompleted: boolean;
}

export interface Campaign {
  id: string;
  umkmId: string;
  title: string;
  brief: string;
  externalAssetUrl: string;
  thumbnailUrl: string;
  niche: CreatorNiche;
  /** `campaigns.type` — "ugc" atau "clipping". */
  type?: string;
  status: CampaignStatus;
  creatorQuota: number;
  usedQuota: number;
  pricePerThousandViews: number;
  totalBudgetEscrow: number;
  usedBudget: number;
  /** Sisa dana di escrow campaign. 0 berarti belum dibayar atau semua reward sudah dicairkan. */
  remainingBudget: number;
  /** Agregasi dari campaign_submissions. `undefined` = belum tersedia, bukan nol tayangan. */
  totalViews?: number;
  createdAt: string;
  updatedAt: string;
  // Optional wizard fields — aligned with Appwrite Campaigns collection schema
  location?: string;      // Target lokasi kreator
  videoStyle?: string;    // Tone/gaya video (natural, edukatif, dll)
  callToAction?: string;  // CTA yang dipilih (kunjungi_toko, dll)
  hashtags?: string;      // Hashtag rekomendasi
  requiredPoints?: string; // Poin penting yang wajib ada di video
  assetNotes?: string;    // Catatan tambahan untuk aset eksternal
}


export interface CampaignSubmission {
  id: string;
  campaignId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string;
  platform: "tiktok" | "instagram";
  contentUrl: string;
  actualViews: number;
  targetViews: number;
  releasedFund: number;
  /** campaign_submissions.status — hasil validasi submission resmi (Admin Marketiv authority, ADR-010) */
  validationStatus: SubmissionStatus;
  /** campaign_submissions.fraudStatus — hasil ai-fraud-precheck, terpisah dari status */
  fraudStatus: FraudStatus;
  rejectedReason?: string;
  submittedAt: string;
  validatedAt?: string;
}

export interface CreatorProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  bannerUrl?: string;
  niche: CreatorNiche;
  bio: string;
  location: string;
  startingPrice: number;
  rating: number;
  completedJobs: number;
  engagementRate: number;
  instagramUrl?: string;
  tiktokUrl?: string;
  isVerified: boolean;
}

export interface PaginatedCreators {
  items: CreatorProfile[];
  total: number;
  nextCursor: string | null;
}

export interface RateCardPackage {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  price: number;
  deliverable: string;
  estimatedDays: number;
  revisionLimit?: number;
  /** rate_cards.status — bukan boolean isActive */
  status: RateCardStatus;
}

export interface PackageContext {
  id: string;
  name: string;
  basePrice: number;
}

/**
 * Satu ruang negosiasi dari sisi UMKM — DTO `get-umkm-negotiations`.
 *
 * DI-KEY OLEH `conversationId`, BUKAN `orderId`. Di Alur B urutannya
 * chat → offer → accept → order, jadi order lahir paling akhir dan sebagian
 * besar hidup ruang ini berjalan tanpa order. Karena itu seluruh field offer
 * dan order bersifat opsional; `stage` adalah satu-satunya penanda tahap yang
 * selalu terisi.
 *
 * Nama tipe dipertahankan supaya diff-nya tidak menyebar ke seluruh komponen.
 */
export interface NegotiationOrder {
  /** = conversationId. Kunci route `/negosiasi/[id_conversation]`. */
  id: string;
  conversationId: string;
  stage: NegotiationStage;

  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string;

  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  /** `conversations.is_archived` — keputusan pengguna, bukan turunan status. */
  isArchived: boolean;

  /** Terisi sejak UMKM mengirim Custom Offer. */
  offerId?: string;
  offerStatus?: OfferStatus;
  projectTitle: string;
  scope: string;
  deadline: string;
  revisionCount?: number;
  /** Snapshot immutable paket yang menjadi acuan, bukan kontrak final. */
  packageContext?: PackageContext;

  /** Terisi setelah kreator accept dan `create-order` selesai (asinkron). */
  orderId?: string;
  orderStatus?: OrderStatus;
  escrowStatus?: EscrowStatus;
  deliverables?: string;
  submittedCollabUrl?: string;
  deliverableValidation?: { status: "pending" | "valid" | "invalid"; reviewedAt?: string; reviewNotes?: string };

  /** Harga order kalau sudah ada, kalau belum harga offer yang ditawar. */
  finalPrice: number;
  /**
   * Selalu 0 untuk UMKM. Rate Card Order adalah seller-side (ADR-008): UMKM
   * membayar persis harga rate card, potongan 2% ditanggung kreator saat escrow
   * dirilis. Field ini ada supaya bentuknya sejajar dengan sisi kreator.
   */
  platformFee: number;
  /** = finalPrice. Yang dibayar UMKM. */
  totalAmount: number;
}

export interface ChatMessage {
  id: string;
  /**
   * `messages.conversation_id`. Dulu bernama `orderId`, dan pembacanya memang
   * mengirim orderId ke `Query.equal("conversation_id", …)` — kunci yang tidak
   * akan pernah cocok, sehingga chat UMKM selalu kosong.
   */
  conversationId: string;
  senderId: string;
  senderRole: "umkm" | "creator" | "system";
  /** messages.message_type kanon */
  type: MessageType;
  content: string;
  /** Terisi saat `type === "offer"`. `offerId` dibutuhkan aksi hapus/terima. */
  offerData?: {
    offerId: string;
    title?: string;
    finalPrice: number;
    scope: string;
    deadline: string;
    revisionCount: number;
  };
  isRead: boolean;
  createdAt: string;
}

/**
 * Satu versi hasil kerja kreator. Kirim ulang membuat BARIS BARU dengan
 * `version + 1`, bukan memperbarui baris lama — riwayat revisi harus utuh.
 *
 * Dipakai kedua peran, jadi ditaruh di sini dan diimpor ulang oleh service
 * kreator (pola yang sama seperti `ChatMessage`).
 */
export interface Deliverable {
  id: string;
  orderId: string;
  /** `external_url` = tautan https; `storage` = berkas di File Manager. */
  source: DeliverableSource;
  fileUrl: string;
  fileId?: string;
  notes?: string;
  version: number;
  status: DeliverableStatus;
  createdAt: string;
}

/** Satu permintaan revisi dari UMKM. Dibatasi `offers.revisionLimit`. */
export interface Revision {
  id: string;
  orderId: string;
  requestedBy: string;
  message: string;
  status: RevisionStatus;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  referenceId: string;
  referenceType: "campaign" | "rate_card";
  amount: number;
  baseAmount?: number;
  feeAmount?: number;
  totalAmount?: number;
  purpose?: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  midtransOrderId?: string;
  /**
   * `payments.redirect_url` dari Midtrans Snap. Ada selama payment masih
   * `pending` — inilah satu-satunya cara sah melanjutkan pembayaran yang
   * tertunda. Tanpa field ini, UI cuma bisa berpura-pura membayar.
   */
  redirectUrl?: string;
  createdAt: string;
}

export interface UmkmDashboardSummary {
  activeCampaigns: number;
  completedCampaigns: number;
  totalViews: number;
  totalSpent: number;
  escrowBalance: number;
  pendingSubmissions: number;
  activeNegotiations: number;
  pendingPayments: number;
  isTruncated?: boolean;
}

/**
 * View-model halaman Overview UMKM.
 *
 * Direlokasi dari src/mocks/umkm/overview.mock.ts (s5-overview-dto) — tipe
 * kembalian service tidak boleh didefinisikan di file mock.
 *
 * Bentuknya sengaja hanya berisi apa yang benar-benar dirender
 * UmkmOverviewClient. Versi lama membawa `campaign`, `escrow`, `submissions`,
 * `chartData`, `greeting`, dan `subtitle` yang tidak pernah dibaca komponen
 * mana pun — field mati yang memaksa cabang Appwrite mengarang isinya.
 */
export interface UmkmOverviewKpis {
  campaignActive: number;
  campaignCompleted: number;
  totalSpend: number;
  escrowBalance: number;
  /** Σ klaim terpakai lintas campaign — jumlah kreator yang sudah bergabung. */
  creatorJoined: number;
  viewsValid: number;
  pendingSubmissions: number;
  isTruncated?: boolean;
}

export interface UmkmOverviewInsight {
  id: string;
  text: string;
  type: "success" | "warning" | "info" | "purple";
}

export interface UmkmOverviewActivity {
  id: string;
  title: string;
  description: string;
  type: "submission" | "campaign" | "payment" | "progress";
  time: string;
}

export interface UmkmOverviewData {
  businessName: string;
  /** Dibawa di sini supaya Overview cukup satu perjalanan, bukan dua. */
  campaigns: Campaign[];
  kpis?: UmkmOverviewKpis;
  /**
   * Belum ada sumbernya di Appwrite — tidak ada mesin insight di backend.
   * Dibiarkan undefined saat mock OFF, bukan diisi kalimat karangan.
   */
  insights?: UmkmOverviewInsight[];
  /** Dari `notifications`; kosong sampai permission baris Function diperbaiki. */
  activities?: UmkmOverviewActivity[];
}

export interface UmkmFinanceSummary {
  totalExpenses: number;
  escrowBalance: number;
  pendingPayments: number;
  refundsReceived: number;
  platformFees: number;
  successfulTransactionsCount: number;
  isTruncated?: boolean;
}

export interface EscrowOverview {
  activeEscrow: number;
  pendingRelease: number;
  refundEligible: number;
  campaignEscrow: number;
  rateCardEscrow: number;
  isTruncated?: boolean;
}

