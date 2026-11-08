/**
 * Pemetaan tabel/kolom Appwrite → Postgres (Supabase).
 *
 * Satu sumber kebenaran untuk loader Fase 2 (`load-staging.ts`) dan, nanti,
 * transform Fase 9. Tabel ringkasnya ada di
 * docs/marketiv-supabase-migration-v1/progress/fase-02.md.
 *
 * Aturan umum (berlaku untuk semua tabel, tidak ditulis ulang per tabel):
 *   $id        → id            (dipertahankan apa adanya)
 *   $createdAt → created_at    (kecuali kolom app `createdAt` terisi; itu yang dipakai)
 *   $updatedAt → updated_at
 *   $permissions, $sequence, $tableId, $databaseId → dibuang (diganti RLS di Fase 3)
 */

export type ColumnKind =
  | "text" // string apa adanya
  | "lower" // string, di-lowercase (enum yang toleran kapital di kode lama)
  | "int" // integer
  | "money" // rupiah → bigint
  | "number" // double → numeric
  | "bool" // boolean; null → default kolom
  | "ts" // datetime ISO → timestamptz
  | "ts_lenient" // string bebas yang harus bisa di-parse Date → timestamptz
  | "user" // ID Auth Appwrite → uuid lewat legacy_user_map
  | "text_array" // string[] → text[]
  | "json_object" // JSON string → jsonb object (gagal parse → null)
  | "json_array"; // JSON string → jsonb array (gagal parse → [])

export interface ColumnMap {
  /** Nama kolom Postgres. */
  pg: string;
  kind: ColumnKind;
}

export interface TableMap {
  /** Nama tabel Postgres. */
  pg: string;
  /** ID tabel Appwrite sumber, urut prioritas (yang terakhir menang bila id/unique bentrok). */
  sources: string[];
  /** Kolom Appwrite → Postgres. Kolom yang tidak disebut dibuang. */
  columns: Record<string, ColumnMap>;
  /** Kolom app yang menggantikan $createdAt / $updatedAt bila terisi. */
  createdAtFrom?: string;
  updatedAtFrom?: string;
  /** Kolom unik (selain id) untuk dedup antar-sumber; dipakai campaign_briefs. */
  dedupBy?: string;
}

const c = (pg: string, kind: ColumnKind): ColumnMap => ({ pg, kind });

/** ID tabel Appwrite campaign_briefs_v2 (tabel brief yang aktif). */
export const CAMPAIGN_BRIEFS_V2_ID = "6ab530d00018edb50097";

/**
 * Urutan = urutan muat (induk sebelum anak). `users` ditangani khusus oleh
 * loader: PK = UUID dari legacy_user_map(userId), `$id` lama → legacy_users_row_id.
 */
export const TABLES: TableMap[] = [
  {
    pg: "users",
    sources: ["users"],
    columns: {
      role: c("role", "lower"),
      status: c("status", "lower"),
      email: c("email", "text"),
      phone: c("phone", "text"),
      address: c("address", "text"),
      suspended_at: c("suspended_at", "ts"),
      tos_version: c("tos_version", "text"),
      tos_accepted_at: c("tos_accepted_at", "ts"),
      email_verified_at: c("email_verified_at", "ts"),
      kyc_status: c("kyc_status", "lower"),
      kyc_verified_at: c("kyc_verified_at", "ts"),
    },
    createdAtFrom: "createdAt",
  },
  {
    pg: "otp_rate_limits",
    sources: ["otp_rate_limits"],
    columns: {
      key: c("key", "text"),
      email: c("email", "text"),
      ip: c("ip", "text"),
      count: c("count", "int"),
      windowStart: c("window_start", "ts"),
    },
    updatedAtFrom: "updatedAt",
  },
  {
    pg: "appeals",
    sources: ["appeals"],
    columns: {
      userId: c("user_id", "user"),
      actionRef: c("action_ref", "text"),
      reason: c("reason", "text"),
      evidence: c("evidence", "text"),
      deadlineAt: c("deadline_at", "ts"),
      slaDecidedAt: c("sla_decided_at", "ts"),
      status: c("status", "text"),
      decision: c("decision", "text"),
      decidedAt: c("decided_at", "ts"),
    },
  },
  {
    pg: "notifications",
    sources: ["notifications"],
    columns: {
      userId: c("user_id", "user"),
      title: c("title", "text"),
      message: c("message", "text"),
      type: c("type", "text"),
      isRead: c("is_read", "bool"),
    },
    createdAtFrom: "createdAt",
  },
  {
    pg: "ai_requests",
    sources: ["ai_requests"],
    columns: {
      userId: c("user_id", "user"),
      feature: c("feature", "text"),
      prompt: c("prompt", "text"),
      response: c("response", "text"),
    },
    createdAtFrom: "createdAt",
  },
  {
    pg: "umkm_profiles",
    sources: ["umkm_profiles"],
    columns: {
      userId: c("user_id", "user"),
      businessName: c("business_name", "text"),
      category: c("category", "text"),
      description: c("description", "text"),
      city: c("city", "text"),
      tiktok: c("tiktok", "text"),
      logoUrl: c("logo_url", "text"),
      isProfileCompleted: c("is_profile_completed", "bool"),
    },
  },
  {
    pg: "creator_profiles",
    sources: ["creator_profiles"],
    columns: {
      userId: c("user_id", "user"),
      displayName: c("display_name", "text"),
      bio: c("bio", "text"),
      city: c("city", "text"),
      avatarUrl: c("avatar_url", "text"),
      bannerUrl: c("banner_url", "text"),
      niche: c("niche", "lower"),
      totalFollowers: c("total_followers", "int"),
      totalOrders: c("total_orders", "int"),
      rating: c("rating", "number"),
      isProfileCompleted: c("is_profile_completed", "bool"),
    },
  },
  {
    pg: "creator_social_accounts",
    sources: ["creator_social_accounts"],
    columns: {
      creatorId: c("creator_id", "user"),
      platform: c("platform", "lower"),
      username: c("username", "text"),
      followers: c("followers", "int"),
      engagementRate: c("engagement_rate", "number"),
    },
  },
  {
    pg: "creator_portfolios",
    sources: ["creator_portfolios"],
    columns: {
      creatorId: c("creator_id", "user"),
      title: c("title", "text"),
      description: c("description", "text"),
      thumbnailUrl: c("thumbnail_url", "text"),
      portfolioUrl: c("portfolio_url", "text"),
    },
  },
  {
    pg: "user_storage_usage",
    sources: ["user_storage_usage"],
    columns: {
      userId: c("user_id", "user"),
      usedBytes: c("used_bytes", "money"),
      quotaBytes: c("quota_bytes", "money"),
      fileCount: c("file_count", "int"),
    },
  },
  {
    pg: "user_files",
    sources: ["user_files"],
    columns: {
      userId: c("user_id", "user"),
      storageFileId: c("storage_file_id", "text"),
      bucketId: c("bucket_id", "text"),
      fileName: c("file_name", "text"),
      mimeType: c("mime_type", "text"),
      sizeBytes: c("size_bytes", "money"),
      status: c("status", "text"),
      deletedAt: c("deleted_at", "ts"),
    },
    createdAtFrom: "createdAt",
  },
  {
    pg: "campaigns",
    sources: ["campaigns"],
    columns: {
      umkmId: c("umkm_id", "user"),
      title: c("title", "text"),
      category: c("category", "text"),
      type: c("type", "lower"),
      platforms: c("platforms", "text_array"),
      description: c("description", "text"),
      budget: c("budget", "money"),
      rewardPer1000Views: c("reward_per_1000_views", "money"),
      status: c("status", "text"),
      claimLimit: c("claim_limit", "int"),
      submissionDays: c("submission_days", "int"),
      totalClaims: c("total_claims", "int"),
      spentAmount: c("spent_amount", "money"),
      remainingBudget: c("remaining_budget", "money"),
      publishedAt: c("published_at", "ts"),
      thumbnailUrl: c("thumbnail_url", "text"),
    },
  },
  {
    pg: "campaign_briefs",
    // Lama dulu, v2 belakangan: bila campaign_id sama, baris v2 yang menang.
    sources: ["campaign_briefs", CAMPAIGN_BRIEFS_V2_ID],
    dedupBy: "campaign_id",
    columns: {
      campaignId: c("campaign_id", "text"),
      objective: c("objective", "text"),
      contentAngle: c("content_angle", "text"),
      cta: c("cta", "text"),
      briefDetail: c("brief_detail", "text"),
      doAndDont: c("do_and_dont", "json_object"),
      materialsJson: c("materials", "json_array"),
      generatedByAi: c("generated_by_ai", "bool"),
    },
  },
  {
    pg: "campaign_assets",
    sources: ["campaign_assets"],
    columns: {
      campaignId: c("campaign_id", "text"),
      source: c("source", "text"),
      type: c("type", "text"),
      fileUrl: c("file_url", "text"),
      fileName: c("file_name", "text"),
    },
  },
  {
    pg: "campaign_claims",
    sources: ["campaign_claims"],
    columns: {
      campaignId: c("campaign_id", "text"),
      creatorId: c("creator_id", "user"),
      status: c("status", "text"),
      claimedAt: c("claimed_at", "ts"),
    },
  },
  {
    pg: "campaign_submissions",
    sources: ["campaign_submissions"],
    columns: {
      claimId: c("claim_id", "text"),
      campaignId: c("campaign_id", "text"),
      creatorId: c("creator_id", "user"),
      platform: c("platform", "lower"),
      postUrl: c("post_url", "text"),
      caption: c("caption", "text"),
      views: c("views", "money"),
      views_count: c("views_count", "money"),
      views_captured_at: c("views_captured_at", "ts"),
      views_source: c("views_source", "text"),
      views_final: c("views_final", "bool"),
      engagement: c("engagement", "money"),
      fraudScore: c("fraud_score", "int"),
      fraudStatus: c("fraud_status", "text"),
      status: c("status", "text"),
      reviewNotes: c("review_notes", "text"),
      creatorCredit: c("creator_credit", "text"),
      aiGenerated: c("ai_generated", "bool"),
      aiDisclosed: c("ai_disclosed", "bool"),
    },
  },
  {
    pg: "fraud_checks",
    sources: ["fraud_checks"],
    columns: {
      submissionId: c("submission_id", "text"),
      score: c("score", "int"),
      result: c("result", "text"),
      reason: c("reason", "text"),
    },
    createdAtFrom: "createdAt",
  },
  {
    pg: "rate_cards",
    sources: ["rate_cards"],
    columns: {
      creatorId: c("creator_id", "user"),
      title: c("title", "text"),
      description: c("description", "text"),
      status: c("status", "text"),
    },
    createdAtFrom: "createdAt",
  },
  {
    pg: "rate_card_packages",
    sources: ["rate_card_packages"],
    columns: {
      rateCardId: c("rate_card_id", "text"),
      name: c("name", "text"),
      description: c("description", "text"),
      output: c("output", "text"),
      deliveryDays: c("delivery_days", "int"),
      price: c("price", "money"),
      revisionLimit: c("revision_limit", "int"),
    },
  },
  {
    // offer_id dimuat di lintasan kedua (setelah offers) — lihat loader.
    pg: "conversations",
    sources: ["conversations"],
    columns: {
      umkm_id: c("umkm_id", "user"),
      creator_id: c("creator_id", "user"),
      offer_id: c("offer_id", "text"),
      last_message: c("last_message", "text"),
      last_message_at: c("last_message_at", "ts"),
      umkm_archived: c("umkm_archived", "bool"),
      creator_archived: c("creator_archived", "bool"),
      is_archived: c("is_archived", "bool"),
    },
  },
  {
    pg: "offers",
    sources: ["offers"],
    columns: {
      conversationId: c("conversation_id", "text"),
      umkmId: c("umkm_id", "user"),
      creatorId: c("creator_id", "user"),
      title: c("title", "text"),
      description: c("description", "text"),
      price: c("price", "money"),
      deadline: c("deadline", "ts_lenient"),
      revisionLimit: c("revision_limit", "int"),
      packageId: c("package_id", "text"),
      packageNameSnapshot: c("package_name_snapshot", "text"),
      packagePriceSnapshot: c("package_price_snapshot", "money"),
      status: c("status", "text"),
    },
    createdAtFrom: "createdAt",
  },
  {
    pg: "messages",
    sources: ["messages"],
    columns: {
      conversation_id: c("conversation_id", "text"),
      sender_id: c("sender_id", "user"),
      message_type: c("message_type", "text"),
      content: c("content", "text"),
      offer_id: c("offer_id", "text"),
      read_at: c("read_at", "ts"),
    },
  },
  {
    pg: "orders",
    sources: ["orders"],
    columns: {
      offerId: c("offer_id", "text"),
      packageId: c("package_id", "text"),
      packageNameSnapshot: c("package_name_snapshot", "text"),
      packagePriceSnapshot: c("package_price_snapshot", "money"),
      creatorId: c("creator_id", "user"),
      umkmId: c("umkm_id", "user"),
      amount: c("amount", "money"),
      status: c("status", "text"),
      review_deadline_at: c("review_deadline_at", "ts"),
      auto_approved: c("auto_approved", "bool"),
      revision_count: c("revision_count", "int"),
      revision_limit: c("revision_limit", "int"),
      reminder_sent_at: c("reminder_sent_at", "ts"),
    },
    createdAtFrom: "createdAt",
  },
  {
    pg: "deliverables",
    sources: ["deliverables"],
    columns: {
      orderId: c("order_id", "text"),
      source: c("source", "text"),
      fileUrl: c("file_url", "text"),
      fileId: c("file_id", "text"),
      notes: c("notes", "text"),
      version: c("version", "int"),
      status: c("status", "text"),
      creatorCredit: c("creator_credit", "text"),
      aiGenerated: c("ai_generated", "bool"),
    },
    createdAtFrom: "createdAt",
  },
  {
    pg: "revisions",
    sources: ["revisions"],
    columns: {
      orderId: c("order_id", "text"),
      requestedBy: c("requested_by", "user"),
      message: c("message", "text"),
      status: c("status", "text"),
    },
  },
  {
    pg: "ratecard_deliverable_validations",
    sources: ["ratecard_deliverable_validations"],
    columns: {
      deliverableId: c("deliverable_id", "text"),
      orderId: c("order_id", "text"),
      deliverableVersion: c("deliverable_version", "int"),
      sourceSnapshot: c("source_snapshot", "text"),
      evidenceUrlSnapshot: c("evidence_url_snapshot", "text"),
      status: c("status", "text"),
      reviewedBy: c("reviewed_by", "user"),
      reviewNotes: c("review_notes", "text"),
      reviewedAt: c("reviewed_at", "ts"),
    },
  },
  {
    pg: "wallets",
    sources: ["wallets"],
    columns: {
      userId: c("user_id", "user"),
      balance: c("balance", "money"),
      pendingBalance: c("pending_balance", "money"),
    },
  },
  {
    pg: "payments",
    sources: ["payments"],
    columns: {
      user_id: c("user_id", "user"),
      order_id: c("order_id", "text"),
      order_payment_key: c("order_payment_key", "text"),
      campaign_id: c("campaign_id", "text"),
      amount: c("amount", "money"),
      total_amount: c("total_amount", "money"),
      fee_amount: c("fee_amount", "money"),
      purpose: c("purpose", "text"),
      gateway: c("gateway", "text"),
      gateway_reference: c("gateway_reference", "text"),
      snap_token: c("snap_token", "text"),
      redirect_url: c("redirect_url", "text"),
      status: c("status", "text"),
      paid_at: c("paid_at", "ts"),
    },
  },
  {
    pg: "transactions",
    sources: ["transactions"],
    columns: {
      userId: c("user_id", "user"),
      amount: c("amount", "money"),
      type: c("type", "text"),
      referenceId: c("reference_id", "text"),
      referenceType: c("reference_type", "text"),
      status: c("status", "text"),
    },
  },
  {
    pg: "escrows",
    sources: ["escrows"],
    columns: {
      orderId: c("order_id", "text"),
      amount: c("amount", "money"),
      status: c("status", "text"),
      fee_rate: c("fee_rate", "number"),
    },
  },
  {
    pg: "withdrawals",
    sources: ["withdrawals"],
    columns: {
      userId: c("user_id", "user"),
      amount: c("amount", "money"),
      payoutMethod: c("payout_method", "text"),
      providerName: c("provider_name", "text"),
      accountNumber: c("account_number", "text"),
      accountName: c("account_name", "text"),
      status: c("status", "text"),
      processing_at: c("processing_at", "ts"),
      processedAt: c("processed_at", "ts"),
      processed_by: c("processed_by", "user"),
      transfer_reference: c("transfer_reference", "text"),
      admin_note: c("admin_note", "text"),
      failure_reason: c("failure_reason", "text"),
      reversed_at: c("reversed_at", "ts"),
      requester_role: c("requester_role", "text"),
      source_origin: c("source_origin", "text"),
      kyc_status: c("kyc_status", "text"),
      iris_reference: c("iris_reference", "text"),
    },
  },
];
