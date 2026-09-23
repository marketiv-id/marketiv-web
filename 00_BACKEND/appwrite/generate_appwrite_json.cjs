const fs = require("fs");
const path = require("path");

/**
 * ⚠️ JANGAN menambahkan kembali `update("users")` ke level tabel.
 *
 * Permission Appwrite bersifat union: dengan documentSecurity aktif, akses
 * diberikan bila ada izin di level TABEL **atau** level baris. Jadi
 * `update("users")` di level tabel berarti *setiap user yang login bisa mengubah
 * baris siapa pun*, dan permission per-baris yang sudah dipasang service menjadi
 * tidak berarti.
 *
 * Dicabut dari 11 tabel pada 2026-07-29 (gelombang 5 harden-permissions) setelah
 * audit menemukan dua jalur eksploitasi nyata:
 *   - `campaign_submissions` → tulis status:"approved" ke submission siapa pun,
 *     memicu calculate-campaign-reward mencetak saldo kreator.
 *   - `campaigns` → tulis status:"active" + remainingBudget, melewati Midtrans
 *     dan seluruh mekanisme escrow.
 *
 * `read("any")` sengaja DIPERTAHANKAN — Job Pool, direktori kreator, dan katalog
 * rate card memang publik. Bucket di bawah punya model izin sendiri (fileSecurity)
 * dan belum ikut gelombang ini.
 */

const databaseId = "6a4c8598001da3b0d7f0";
const databaseName = "db_marketiv";

const createStringAttr = (
  key,
  required = false,
  size = 255,
  def = null,
  array = false,
) => ({
  key,
  type: "string",
  required,
  array,
  size,
  default: def,
  encrypt: false,
});
const createIntAttr = (key, required = false, def = null, array = false) => ({
  key,
  type: "integer",
  required,
  array,
  default: def,
  min: 0,
  max: 999999999,
});
const createFloatAttr = (key, required = false, def = null, array = false) => ({
  key,
  type: "double",
  required,
  array,
  default: def,
  min: 0,
  max: 999999999,
});
const createBoolAttr = (key, required = false, def = null, array = false) => ({
  key,
  type: "boolean",
  required,
  array,
  default: def,
});
const createDatetimeAttr = (key, required = false, array = false) => ({
  key,
  type: "datetime",
  required,
  array,
  default: null,
});
// `format` dan `size` WAJIB ikut ditulis. Tanpa keduanya `appwrite push tables`
// gagal dengan `Missing required parameter: "size"` saat harus membuat ulang
// kolomnya — itu yang menghentikan push di `creator_profiles.niche` (2026-07-27).
// Nilai size mengikuti perilaku server Appwrite: sepanjang elemen terpanjang.
const createEnumAttr = (key, required = false, elements = [], def = null) => ({
  key,
  type: "string",
  required,
  array: false,
  format: "enum",
  elements,
  size: Math.max(...elements.map((e) => e.length)),
  default: def,
  encrypt: false,
});

const createIndex = (key, type, attributes, orders = []) => {
  if (orders.length === 0) {
    orders = attributes.map(() => "ASC");
  }
  return { key, type, status: "available", attributes, orders };
};

const collections = [
  // ── Modul Users ──────────────────────────────────
  {
    $id: "users",
    name: "Users",
    // Kosong: read("users") level koleksi membuat email & telepon SEMUA user
    // terbaca siapa pun yang login — permission Appwrite adalah union, bukan
    // intersection. Baca hanya lewat permission baris (create-user-profile:96).
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true),
      createStringAttr("role", true, 50),
      createEnumAttr("status", true, ["active", "suspended", "terminated"]),
      createStringAttr("address", false, 500),
      createStringAttr("email", true),
      createStringAttr("phone", false, 50),
      createDatetimeAttr("createdAt", false),
      createDatetimeAttr("suspended_at", false),
      createStringAttr("tos_version", false, 20),
      createDatetimeAttr("tos_accepted_at", false),
      createDatetimeAttr("email_verified_at", false),
      createEnumAttr("kyc_status", false, ["none", "pending_wa", "verified"]),
      createDatetimeAttr("kyc_verified_at", false),
    ],
    indexes: [
      createIndex("idx_userId", "unique", ["userId"]),
      createIndex("idx_email", "unique", ["email"]),
      createIndex("idx_role", "key", ["role"]),
      createIndex("idx_status", "key", ["status"]),
    ],
  },
  {
    $id: "appeals",
    name: "Appeals",
    $permissions: ['create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true, 255),
      createStringAttr("actionRef", true, 255),
      createStringAttr("reason", true, 1000),
      createStringAttr("evidence", false, 2048),
      createDatetimeAttr("deadlineAt", true),
      createDatetimeAttr("slaDecidedAt", true),
      createEnumAttr("status", true, [
        "submitted",
        "under_review",
        "approved",
        "rejected",
      ]),
      createStringAttr("decision", false, 1000),
      createDatetimeAttr("decidedAt", false),
    ],
    indexes: [
      createIndex("idx_userId", "key", ["userId"]),
      createIndex("idx_status", "key", ["status"]),
      createIndex("idx_userId_status", "key", ["userId", "status"]),
    ],
  },
  {
    $id: "otp_rate_limits",
    name: "OTP Rate Limits",
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("key", true, 64),
      createStringAttr("email", true, 255),
      createStringAttr("ip", true, 100),
      createIntAttr("count", true),
      createDatetimeAttr("windowStart", true),
      createDatetimeAttr("updatedAt", true),
    ],
    indexes: [
      createIndex("idx_key", "unique", ["key"]),
      createIndex("idx_email", "key", ["email"]),
      createIndex("idx_ip", "key", ["ip"]),
      createIndex("idx_updatedAt", "key", ["updatedAt"]),
    ],
  },
  {
    $id: "umkm_profiles",
    name: "UMKM Profiles",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true),
      createStringAttr("businessName", true, 255),
      createStringAttr("category", true, 100),
      createStringAttr("description", false, 2000),
      createStringAttr("city", false, 100),
      createStringAttr("tiktok", false, 255),
      createStringAttr("logoUrl", false, 2048),
      createBoolAttr("isProfileCompleted", false, false),
    ],
    indexes: [
      createIndex("idx_userId", "unique", ["userId"]),
      createIndex("idx_city", "key", ["city"]),
      createIndex("idx_category", "key", ["category"]),
      createIndex("idx_isProfileCompleted", "key", ["isProfileCompleted"]),
    ],
  },
  {
    $id: "creator_profiles",
    name: "Creator Profiles",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true),
      createStringAttr("displayName", true, 255),
      createStringAttr("bio", false, 2000),
      createStringAttr("city", false, 100),
      createStringAttr("avatarUrl", false, 2048),
      createStringAttr("bannerUrl", false, 2048),
      // Tidak ada kolom lain yang bisa menurunkan niche kreator — campaigns.category
      // milik UMKM. Dipakai get-creator-directory; kosong → "lainnya".
      createEnumAttr("niche", false, [
        "kuliner",
        "fashion",
        "pariwisata",
        "edukasi",
        "kecantikan",
        "lainnya",
      ]),
      createIntAttr("totalFollowers", false, 0),
      createIntAttr("totalOrders", false, 0),
      createFloatAttr("rating", false, 0),
      createBoolAttr("isProfileCompleted", false, false),
    ],
    indexes: [
      createIndex("idx_userId", "unique", ["userId"]),
      createIndex("idx_displayName", "key", ["displayName"]),
      createIndex("idx_city", "key", ["city"]),
      createIndex("idx_niche", "key", ["niche"]),
      createIndex("idx_rating", "key", ["rating"]),
      createIndex("idx_totalFollowers", "key", ["totalFollowers"]),
      createIndex("idx_isProfileCompleted", "key", ["isProfileCompleted"]),
    ],
  },
  {
    $id: "creator_social_accounts",
    name: "Creator Social Accounts",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("creatorId", true),
      createStringAttr("platform", true, 50),
      createStringAttr("username", true, 255),
      createIntAttr("followers", false, 0),
      createFloatAttr("engagementRate", false, 0),
    ],
    indexes: [
      createIndex("idx_creatorId", "key", ["creatorId"]),
      createIndex("idx_platform", "key", ["platform"]),
      createIndex("idx_followers", "key", ["followers"]),
    ],
  },
  {
    $id: "creator_portfolios",
    name: "Creator Portfolios",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("creatorId", true),
      createStringAttr("title", true, 255),
      createStringAttr("description", false, 2000),
      createStringAttr("thumbnailUrl", false, 2048),
      createStringAttr("portfolioUrl", false, 2048),
    ],
    indexes: [createIndex("idx_creatorId", "key", ["creatorId"])],
  },
  {
    $id: "user_storage_usage",
    name: "User Storage Usage",
    // Kosong: kuota & pemakaian semua user tidak boleh saling terbaca.
    // Row perm dipasang create-user-profile:162.
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true),
      createIntAttr("usedBytes", false, 0),
      createIntAttr("quotaBytes", false, 104857600),
      createIntAttr("fileCount", false, 0),
    ],
    indexes: [createIndex("idx_userId", "unique", ["userId"])],
  },
  {
    $id: "user_files",
    name: "User Files",
    // Kosong: daftar berkas semua user tidak boleh saling terbaca.
    // Row perm dipasang validate-and-upload:66.
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true),
      createStringAttr("storageFileId", true),
      createStringAttr("bucketId", true),
      createStringAttr("fileName", true, 255),
      createStringAttr("mimeType", true, 100),
      createIntAttr("sizeBytes", true),
      createStringAttr("status", true, 50),
      createDatetimeAttr("createdAt", false),
      createDatetimeAttr("deletedAt", false),
    ],
    indexes: [
      createIndex("idx_userId_status", "key", ["userId", "status"]),
      createIndex("idx_storageFileId", "unique", ["storageFileId"]),
      createIndex(
        "idx_status_createdAt",
        "key",
        ["status", "createdAt"],
        ["ASC", "DESC"],
      ),
    ],
  },
  {
    $id: "campaigns",
    name: "Campaigns",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("umkmId", true),
      createStringAttr("title", true, 255),
      createStringAttr("category", true, 100),
      createStringAttr("type", true, 50),
      createStringAttr("platforms", true, 255, null, true),
      createStringAttr("description", false, 2000),
      createIntAttr("budget", true),
      createIntAttr("rewardPer1000Views", true),
      createStringAttr("status", true, 50),
      createIntAttr("claimLimit", true),
      createIntAttr("submissionDays", false, 7),
      createIntAttr("totalClaims", false, 0),
      createIntAttr("spentAmount", false, 0),
      createIntAttr("remainingBudget", false, 0),
      createDatetimeAttr("publishedAt", false),
    ],
    indexes: [
      createIndex("idx_umkmId", "key", ["umkmId"]),
      createIndex("idx_status", "key", ["status"]),
      createIndex("idx_category", "key", ["category"]),
      createIndex("idx_publishedAt", "key", ["publishedAt"], ["DESC"]),
      createIndex("idx_remainingBudget", "key", ["remainingBudget"]),
    ],
  },
  {
    $id: "campaign_assets",
    name: "Campaign Assets",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("campaignId", true),
      createStringAttr("source", true, 50),
      createStringAttr("type", true, 50),
      createStringAttr("fileUrl", true, 2048),
      createStringAttr("fileName", false, 255),
    ],
    indexes: [createIndex("idx_campaignId", "key", ["campaignId"])],
  },
  {
    $id: "fraud_checks",
    name: "Fraud Checks",
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("submissionId", true),
      createIntAttr("score", true),
      createStringAttr("result", true, 50),
      createStringAttr("reason", false, 2000),
      createDatetimeAttr("createdAt", false),
    ],
    indexes: [
      createIndex("idx_submissionId", "key", ["submissionId"]),
      createIndex("idx_result", "key", ["result"]),
      createIndex("idx_createdAt", "key", ["createdAt"], ["DESC"]),
    ],
  },
  {
    $id: "campaign_briefs",
    name: "Campaign Briefs",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("campaignId", true),
      createStringAttr("objective", false, 2000),
      createStringAttr("contentAngle", false, 2000),
      createStringAttr("cta", false, 1000),
      createStringAttr("briefDetail", false, 10000),
      createStringAttr("doAndDont", false, 400),
      createStringAttr("materialsJson", false, 300),
      createBoolAttr("generatedByAi", false, false),
    ],
    indexes: [createIndex("idx_campaignId", "unique", ["campaignId"])],
  },
  {
    $id: "campaign_claims",
    name: "Campaign Claims",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("campaignId", true),
      createStringAttr("creatorId", true),
      createStringAttr("status", true, 50),
      createDatetimeAttr("claimedAt", true),
    ],
    indexes: [
      createIndex("idx_campaignId", "key", ["campaignId"]),
      createIndex("idx_creatorId", "key", ["creatorId"]),
      createIndex("idx_status", "key", ["status"]),
      createIndex("idx_claimedAt", "key", ["claimedAt"], ["DESC"]),
    ],
  },
  {
    $id: "campaign_submissions",
    name: "Campaign Submissions",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("claimId", true),
      createStringAttr("campaignId", true),
      createStringAttr("creatorId", true),
      createStringAttr("platform", true, 50),
      createStringAttr("postUrl", true, 2048),
      createStringAttr("caption", false, 1000),
      createIntAttr("views", true),
      createIntAttr("views_count", false, null),
      createDatetimeAttr("views_captured_at", false),
      createEnumAttr(
        "views_source",
        false,
        ["api", "scrape", "manual_admin"],
        null,
      ),
      createBoolAttr("views_final", false, false),
      createIntAttr("engagement", false),
      createIntAttr("fraudScore", false),
      createStringAttr("fraudStatus", false, 50),
      createStringAttr("status", true, 50),
      createStringAttr("reviewNotes", false, 1000),
      createStringAttr("creatorCredit", false, 255),
      createBoolAttr("aiGenerated", false, null),
      createBoolAttr("aiDisclosed", false, null),
    ],
    indexes: [
      createIndex("idx_claimId", "unique", ["claimId"]),
      createIndex("idx_campaignId", "key", ["campaignId"]),
      createIndex("idx_creatorId", "key", ["creatorId"]),
      createIndex("idx_status", "key", ["status"]),
      createIndex("idx_fraudStatus", "key", ["fraudStatus"]),
    ],
  },
  {
    $id: "rate_cards",
    name: "Rate Cards",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("creatorId", true),
      createStringAttr("title", true, 255),
      createStringAttr("description", false, 2000),
      createStringAttr("status", true, 50),
      createDatetimeAttr("createdAt", false),
    ],
    indexes: [
      createIndex("idx_creatorId", "key", ["creatorId"]),
      createIndex("idx_status", "key", ["status"]),
      createIndex("idx_createdAt", "key", ["createdAt"], ["DESC"]),
    ],
  },
  {
    $id: "rate_card_packages",
    name: "Rate Card Packages",
    $permissions: ['read("any")', 'create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("rateCardId", true),
      createStringAttr("name", true, 100),
      createStringAttr("description", true, 2000),
      createStringAttr("output", true, 2000),
      createIntAttr("deliveryDays", true),
      createIntAttr("price", true),
      createIntAttr("revisionLimit", true),
    ],
    indexes: [
      createIndex("idx_rateCardId", "key", ["rateCardId"]),
      createIndex("idx_price", "key", ["price"]),
    ],
  },
  {
    $id: "conversations",
    name: "Conversations",
    // read & update dicabut: daftar lawan bicara semua user terbaca.
    // Row perm dipasang chat.service.ts:123 untuk kedua pihak.
    $permissions: ['create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("umkm_id", true),
      createStringAttr("creator_id", true),
      createStringAttr("offer_id", false, 255),
      createStringAttr("last_message", false, 1000),
      createDatetimeAttr("last_message_at", false),
      createBoolAttr("umkm_archived", false, false),
      createBoolAttr("creator_archived", false, false),
      // Deprecated compatibility field. Per-participant columns are authoritative.
      createBoolAttr("is_archived", false, false),
    ],
    indexes: [
      createIndex("idx_umkm_id", "key", ["umkm_id"]),
      createIndex("idx_creator_id", "key", ["creator_id"]),
      createIndex("idx_umkm_creator", "unique", ["umkm_id", "creator_id"]),
      createIndex("idx_offer_id", "key", ["offer_id"]),
    ],
  },
  {
    $id: "messages",
    name: "Messages",
    // read & update dicabut: SELURUH isi chat semua user terbaca kalau
    // dibiarkan. Row perm (read + update untuk kedua pihak) dipasang
    // chat.service.ts:160.
    $permissions: ['create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("conversation_id", true),
      createStringAttr("sender_id", true),
      createStringAttr("message_type", true, 50),
      createStringAttr("content", false, 2000),
      createStringAttr("offer_id", false, 255),
      createDatetimeAttr("read_at", false),
    ],
    indexes: [
      createIndex("idx_conversation_id", "key", ["conversation_id"]),
      createIndex("idx_sender_id", "key", ["sender_id"]),
      createIndex("idx_read_at", "key", ["read_at"]),
    ],
  },
  {
    $id: "offers",
    name: "Offers",
    // read & update dicabut: nilai & isi penawaran semua user terbaca.
    // Row perm dipasang offer.service.ts:147-150.
    $permissions: ['create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("conversationId", true),
      createStringAttr("umkmId", true),
      createStringAttr("creatorId", true),
      createStringAttr("title", true, 255),
      createStringAttr("description", false, 2000),
      createIntAttr("price", true),
      createStringAttr("deadline", true, 255),
      createIntAttr("revisionLimit", true),
      // Provenance paket opsional: final kontrak tetap field offer sendiri.
      createStringAttr("packageId", false),
      createStringAttr("packageNameSnapshot", false, 100),
      createIntAttr("packagePriceSnapshot", false),
      createStringAttr("status", true, 50),
      createDatetimeAttr("createdAt", false),
    ],
    indexes: [
      createIndex("idx_conversationId", "key", ["conversationId"]),
      createIndex("idx_packageId", "key", ["packageId"]),
      createIndex("idx_status", "key", ["status"]),
      createIndex("idx_createdAt", "key", ["createdAt"], ["DESC"]),
    ],
  },
  {
    $id: "orders",
    name: "Orders",
    // Kosong: nominal & pihak order semua user terbaca kalau read("users")
    // dibiarkan. Baris orders HANYA dibuat Function create-order (row perm
    // di :32-37), tidak pernah dari browser — jadi create("users") pun tidak
    // diperlukan.
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("offerId", false),
      createStringAttr("packageId", false),
      createStringAttr("packageNameSnapshot", false, 100),
      createIntAttr("packagePriceSnapshot", false),
      createStringAttr("creatorId", true),
      createStringAttr("umkmId", true),
      createIntAttr("amount", true),
      createStringAttr("status", true, 50),
      createDatetimeAttr("createdAt", false),
      createDatetimeAttr("review_deadline_at", false),
      createBoolAttr("auto_approved", false, false),
      createIntAttr("revision_count", false, 0),
      createIntAttr("revision_limit", false, 0),
      createDatetimeAttr("reminder_sent_at", false),
    ],
    indexes: [
      createIndex("idx_offerId", "unique", ["offerId"]),
      createIndex("idx_packageId", "key", ["packageId"]),
      createIndex("idx_creatorId", "key", ["creatorId"]),
      createIndex("idx_umkmId", "key", ["umkmId"]),
      createIndex("idx_status", "key", ["status"]),
      createIndex("idx_createdAt", "key", ["createdAt"], ["DESC"]),
    ],
  },
  {
    $id: "deliverables",
    name: "Deliverables",
    // Sengaja TANPA read/update("users"): permission Appwrite adalah union,
    // jadi update("users") di sini membuat setiap user login bisa mengubah
    // baris deliverable siapa pun — termasuk menyetujuinya, dan approve
    // itulah yang memicu release-escrow mencairkan dana ke wallet kreator.
    // Akses hanya lewat permission baris yang dipasang Function
    // submit-ratecard-deliverable (read: kedua pihak, update: UMKM saja).
    // Create browser juga ditutup: selain tidak bisa memberi izin ke UMKM,
    // jalur itu melewati authorization order dan validasi file server-side.
    // JANGAN kembalikan create/read/update("users") di sini.
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("orderId", true),
      createStringAttr("source", true, 50),
      createStringAttr("fileUrl", true, 2048),
      createStringAttr("fileId", false),
      createStringAttr("notes", false, 2000),
      createIntAttr("version", true),
      createStringAttr("status", true, 50),
      createDatetimeAttr("createdAt", false),
      createStringAttr("creatorCredit", false, 255),
      createBoolAttr("aiGenerated", false, null),
    ],
    indexes: [
      createIndex("idx_orderId", "key", ["orderId"]),
      createIndex("idx_createdAt", "key", ["createdAt"], ["DESC"]),
    ],
  },
  {
    $id: "revisions",
    name: "Revisions",
    // Browser tidak boleh membuat atau mengubah revision. Function
    // request-ratecard-revision memasang read permission per baris untuk
    // UMKM + Creator yang terlibat.
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("orderId", true),
      createStringAttr("requestedBy", true),
      createStringAttr("message", true, 2000),
      createStringAttr("status", true, 50),
    ],
    indexes: [
      createIndex("idx_orderId", "key", ["orderId"]),
      createIndex("idx_status", "key", ["status"]),
    ],
  },
  {
    $id: "ratecard_deliverable_validations",
    name: "Rate Card Deliverable Validations",
    // Keputusan Admin adalah sumber kebenaran finansial. Browser tidak boleh
    // membuat, membaca, atau mengubah record ini secara langsung; seluruh
    // akses lewat Function DTO Admin/participant yang menyaring field aman.
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("deliverableId", true),
      createStringAttr("orderId", true),
      createIntAttr("deliverableVersion", true),
      createStringAttr("sourceSnapshot", true, 50),
      createStringAttr("evidenceUrlSnapshot", true, 2048),
      createStringAttr("status", true, 20),
      createStringAttr("reviewedBy", true),
      createStringAttr("reviewNotes", false, 2000),
      createDatetimeAttr("reviewedAt", true),
    ],
    indexes: [
      createIndex("idx_deliverableId", "unique", ["deliverableId"]),
      createIndex("idx_orderId", "key", ["orderId"]),
      createIndex("idx_status", "key", ["status"]),
      createIndex("idx_reviewedAt", "key", ["reviewedAt"], ["DESC"]),
    ],
  },
  {
    $id: "wallets",
    name: "Wallets",
    // Sengaja KOSONG (commit c222063): collection-level read("users") membuat
    // setiap user login bisa membaca saldo user mana pun — permission Appwrite
    // adalah union, bukan intersection. Akses hanya lewat permission baris
    // yang dipasang create-user-wallet/create-escrow/release-escrow.
    // JANGAN kembalikan read("users") di sini.
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true),
      createIntAttr("balance", false, 0),
      createIntAttr("pendingBalance", false, 0),
    ],
    indexes: [createIndex("idx_userId", "unique", ["userId"])],
  },
  {
    $id: "payments",
    name: "Payments",
    // Kosong: snap_token, redirect_url, dan nominal semua user terbaca kalau
    // read("users") dibiarkan. Row perm dipasang create-payment:74.
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("user_id", true),
      createStringAttr("order_id", false),
      createStringAttr("order_payment_key", false),
      createStringAttr("campaign_id", false),
      createIntAttr("amount", true),
      createIntAttr("total_amount", true),
      createIntAttr("fee_amount", false, 0),
      createStringAttr("purpose", true, 50),
      createStringAttr("gateway", false, 50, "midtrans"),
      createStringAttr("gateway_reference", true, 255),
      createStringAttr("snap_token", false, 255),
      createStringAttr("redirect_url", false, 2048),
      createStringAttr("status", true, 50),
      createDatetimeAttr("paid_at", false),
    ],
    indexes: [
      createIndex("idx_gateway_reference", "unique", ["gateway_reference"]),
      createIndex("idx_order_payment_key", "unique", ["order_payment_key"]),
      createIndex("idx_order_id", "key", ["order_id"]),
      createIndex("idx_campaign_id", "key", ["campaign_id"]),
      createIndex("idx_user_id", "key", ["user_id"]),
      createIndex("idx_status", "key", ["status"]),
      createIndex("idx_purpose", "key", ["purpose"]),
    ],
  },
  {
    $id: "transactions",
    name: "Transactions",
    // Sengaja KOSONG (commit c222063) — alasan sama seperti `wallets`:
    // read("users") level collection membocorkan seluruh riwayat transaksi
    // semua user. Akses hanya lewat permission baris per-dokumen.
    // JANGAN kembalikan read("users") di sini.
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true),
      createIntAttr("amount", true),
      createStringAttr("type", true, 50),
      createStringAttr("referenceId", false),
      createStringAttr("referenceType", false, 50),
      createStringAttr("status", true, 50),
    ],
    indexes: [
      createIndex("idx_userId", "key", ["userId"]),
      createIndex("idx_referenceId", "key", ["referenceId"]),
      createIndex("idx_referenceType", "key", ["referenceType"]),
      createIndex("idx_status", "key", ["status"]),
    ],
  },
  {
    $id: "escrows",
    name: "Escrows",
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("orderId", true),
      createIntAttr("amount", true),
      createStringAttr("status", true, 50),
      createFloatAttr("fee_rate", false, 0),
    ],
    indexes: [
      createIndex("idx_orderId", "unique", ["orderId"]),
      createIndex("idx_status", "key", ["status"]),
    ],
  },
  {
    $id: "withdrawals",
    name: "Withdrawals",
    // read dicabut: nomor rekening & nominal penarikan semua user terbaca.
    // create dipertahankan untuk jalur klien; row perm dipasang
    // request-withdrawal:70.
    $permissions: ['create("users")'],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true),
      createIntAttr("amount", true),
      createStringAttr("payoutMethod", true, 50),
      createStringAttr("providerName", true, 100),
      createStringAttr("accountNumber", true, 100),
      createStringAttr("accountName", true, 255),
      createEnumAttr("status", true, [
        "requested",
        "processing",
        "succeeded",
        "failed",
        "reversed",
      ]),
      createDatetimeAttr("processing_at", false),
      createDatetimeAttr("processedAt", false),
      createStringAttr("processed_by", false, 255),
      createStringAttr("transfer_reference", false, 255),
      createStringAttr("admin_note", false, 1000),
      createStringAttr("failure_reason", false, 500),
      createDatetimeAttr("reversed_at", false),
      createStringAttr("requester_role", false, 20),
      createEnumAttr("source_origin", false, [
        "creator",
        "umkm_refund",
        "umkm_budget",
      ]),
      createEnumAttr("kyc_status", false, ["none", "pending_wa", "verified"]),
      createStringAttr("iris_reference", false, 255),
    ],
    indexes: [
      createIndex("idx_userId", "key", ["userId"]),
      createIndex("idx_status", "key", ["status"]),
    ],
  },
  {
    $id: "notifications",
    name: "Notifications",
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true),
      createStringAttr("title", true, 255),
      createStringAttr("message", true, 1000),
      createStringAttr("type", true, 50),
      createBoolAttr("isRead", false, false),
      createDatetimeAttr("createdAt", false),
    ],
    indexes: [
      createIndex("idx_userId", "key", ["userId"]),
      createIndex("idx_isRead", "key", ["isRead"]),
      createIndex("idx_createdAt", "key", ["createdAt"], ["DESC"]),
    ],
  },
  // ── Modul AI ──────────────────────────────────────
  {
    $id: "ai_requests",
    name: "AI Requests",
    $permissions: [],
    documentSecurity: true,
    enabled: true,
    attributes: [
      createStringAttr("userId", true),
      createEnumAttr("feature", true, ["brief", "fraud", "landing"]),
      createStringAttr("prompt", true, 5000),
      createStringAttr("response", false, 10000),
      createDatetimeAttr("createdAt", false),
    ],
    indexes: [
      createIndex("idx_userId", "key", ["userId"]),
      createIndex("idx_feature", "key", ["feature"]),
      createIndex("idx_createdAt", "key", ["createdAt"], ["DESC"]),
    ],
  },
];

const tables = collections.map((collection) => {
  const {
    documentSecurity,
    attributes = [],
    indexes = [],
    ...table
  } = collection;

  return {
    ...table,
    databaseId,
    rowSecurity: documentSecurity,
    columns: attributes,
    indexes: indexes.map(({ attributes: indexAttributes, ...index }) => ({
      ...index,
      columns: indexAttributes,
    })),
  };
});

const buckets = [
  {
    $id: "avatars",
    name: "Avatars",
    $permissions: [
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 5000000,
    allowedFileExtensions: ["jpg", "jpeg", "png", "webp"],
    compression: "gzip",
    encryption: false,
    antivirus: true,
  },
  {
    $id: "creator-banners",
    name: "Creator Banners",
    $permissions: [
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 5000000,
    allowedFileExtensions: ["jpg", "jpeg", "png", "webp"],
    compression: "gzip",
    encryption: false,
    antivirus: true,
  },
  {
    $id: "logos",
    name: "Logos",
    $permissions: [
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 5000000,
    allowedFileExtensions: ["jpg", "jpeg", "png", "webp", "svg"],
    compression: "gzip",
    encryption: false,
    antivirus: true,
  },
  {
    $id: "portfolios",
    name: "Portfolios",
    $permissions: [
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 50000000,
    allowedFileExtensions: ["jpg", "jpeg", "png", "webp", "pdf", "mp4"],
    compression: "gzip",
    encryption: false,
    antivirus: true,
  },
  {
    $id: "campaign-assets",
    name: "Campaign Assets",
    $permissions: [
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 100000000,
    allowedFileExtensions: [], // allow all
    compression: "gzip",
    encryption: false,
    antivirus: true,
  },
  {
    $id: "deliverables",
    name: "Deliverables",
    $permissions: ['read("users")', 'create("users")', 'update("users")'],
    fileSecurity: true,
    enabled: true,
    maximumFileSize: 500000000, // 500MB
    allowedFileExtensions: [],
    compression: "none",
    encryption: false,
    antivirus: true,
  },
  {
    $id: "fraud-evidence",
    name: "Fraud Evidence",
    $permissions: ['read("users")'], // System writes, admin/user reads
    fileSecurity: true,
    enabled: true,
    maximumFileSize: 5000000,
    allowedFileExtensions: ["jpg", "jpeg", "png", "pdf"],
    compression: "gzip",
    encryption: false,
    antivirus: true,
  },
  {
    $id: "user-files",
    name: "User Files",
    // Sengaja TANPA read("users"): permission Appwrite adalah union, jadi
    // itu membuat setiap user login bisa mengunduh berkas siapa pun —
    // termasuk deliverable order orang lain dan dokumen pribadi. Bucket ini
    // punya fileSecurity, dan validate-and-upload sudah memasang permission
    // per-berkas (pemilik, plus pihak lawan order bila `shareWithOrderId`
    // dikirim). Itulah satu-satunya jalur baca yang benar.
    // JANGAN kembalikan read("users") di sini.
    $permissions: ['create("users")'],
    fileSecurity: true,
    enabled: true,
    maximumFileSize: 20971520, // 20 MB
    allowedFileExtensions: [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "svg",
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "mp4",
      "mov",
      "avi",
    ],
    compression: "gzip",
    encryption: false,
    antivirus: true,
  },
];

const functions = [
  {
    $id: "suspend-user",
    name: "Suspend User",
    runtime: "node-22",
    execute: [],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    ignore: ["node_modules", ".env"],
    path: "../functions/suspend-user",
    scopes: ["documents.read", "documents.write"],
  },
  {
    $id: "unsuspend-user",
    name: "Unsuspend User",
    runtime: "node-22",
    execute: [],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    ignore: ["node_modules", ".env"],
    path: "../functions/unsuspend-user",
    scopes: ["documents.read", "documents.write"],
  },
  {
    $id: "create-appeal",
    name: "Create Appeal",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    ignore: ["node_modules", ".env"],
    path: "../functions/create-appeal",
    scopes: ["documents.read", "documents.write"],
  },
  {
    $id: "review-appeal",
    name: "Review Appeal",
    runtime: "node-22",
    execute: [],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    ignore: ["node_modules", ".env"],
    path: "../functions/review-appeal",
    scopes: ["documents.read", "documents.write"],
  },
  {
    $id: "create-user-profile",
    name: "Create User Profile",
    runtime: "node-22",
    execute: ["users"],
    events: ["users.*.create"],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/create-user-profile",
  },
  {
    $id: "request-password-otp",
    name: "Request Password OTP",
    runtime: "node-22",
    execute: ["any"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/request-password-otp",
  },
  {
    $id: "reset-password-with-otp",
    name: "Reset Password With OTP",
    runtime: "node-22",
    execute: ["any"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/reset-password-with-otp",
  },
  {
    $id: "accept-tos",
    name: "Accept ToS",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/accept-tos",
  },
  {
    // Update profil UMKM/Kreator + hitung isProfileCompleted server-side.
    // Client tidak boleh menulis flag completion (RoleGuard/claim/direktori).
    $id: "update-profile",
    name: "Update Profile",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/update-profile",
  },
  {
    $id: "validate-and-upload",
    name: "Validate And Upload",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/validate-and-upload",
  },
  {
    $id: "delete-file",
    name: "Delete File",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/delete-file",
  },
  {
    $id: "create-user-wallet",
    name: "Create User Wallet",
    runtime: "node-22",
    execute: [],
    events: ["users.*.create"],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/create-user-wallet",
  },
  {
    $id: "user-email-verified",
    name: "User Email Verified",
    runtime: "node-22",
    execute: [],
    events: ["users.*.update"],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/user-email-verified",
  },
  {
    $id: "campaign-published",
    name: "Campaign Published",
    runtime: "node-22",
    execute: [],
    events: [`databases.${databaseId}.tables.campaigns.rows.*.update`],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/campaign-published",
  },
  {
    $id: "ai-brief",
    name: "AI Brief Generator",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/ai-brief",
  },
  {
    $id: "ai-fraud-precheck",
    name: "AI Fraud Precheck",
    runtime: "node-22",
    execute: [],
    events: [
      `databases.${databaseId}.tables.campaign_submissions.rows.*.create`,
    ],
    schedule: "",
    timeout: 60,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/ai-fraud-precheck",
  },
  {
    $id: "create-order",
    name: "Create Order",
    runtime: "node-22",
    execute: [],
    events: [`databases.${databaseId}.tables.offers.rows.*.update`],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/create-order",
  },
  {
    $id: "calculate-campaign-reward",
    name: "Calculate Campaign Reward",
    runtime: "node-22",
    execute: [],
    events: [
      `databases.${databaseId}.tables.campaign_submissions.rows.*.update`,
    ],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/calculate-campaign-reward",
  },
  {
    $id: "campaign-claimed",
    name: "Campaign Claimed",
    runtime: "node-22",
    execute: [],
    events: [`databases.${databaseId}.tables.campaign_claims.rows.*.create`],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/campaign-claimed",
  },
  {
    $id: "expire-stale-claims",
    name: "Expire Stale Claims",
    runtime: "node-22",
    execute: [],
    events: [],
    schedule: "0 */6 * * *",
    timeout: 60,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/expire-stale-claims",
  },
  {
    $id: "mature-pending-balance",
    name: "Mature Pending Balance",
    runtime: "node-22",
    execute: [],
    events: [],
    // Retired 2026-08-25 after staging inventory confirmed zero pending wallet
    // balance and zero unmatured campaign reward ledger. Keep source for audit.
    schedule: "",
    timeout: 60,
    enabled: false,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/mature-pending-balance",
  },
  {
    $id: "create-payment",
    name: "Create Payment",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/create-payment",
  },
  {
    $id: "request-withdrawal",
    name: "Request Withdrawal",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/request-withdrawal",
  },
  {
    $id: "midtrans-webhook",
    name: "Midtrans Webhook",
    runtime: "node-22",
    execute: ["any"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/midtrans-webhook",
  },
  {
    $id: "withdrawal-callback",
    name: "Withdrawal Callback",
    runtime: "node-22",
    // Retired 2026-08-25 after staging inventory confirmed zero processing
    // Iris withdrawals and zero rows with iris_reference. Keep historical code.
    execute: [],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: false,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/withdrawal-callback",
  },
  {
    $id: "verify-kyc",
    name: "Verify KYC",
    runtime: "node-22",
    execute: [],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/verify-kyc",
  },
  {
    $id: "create-escrow",
    name: "Create Escrow",
    runtime: "node-22",
    execute: [],
    events: [`databases.${databaseId}.tables.payments.rows.*.update`],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/create-escrow",
  },
  {
    $id: "release-escrow",
    name: "Release Escrow",
    runtime: "node-22",
    execute: [],
    events: [
      `databases.${databaseId}.tables.deliverables.rows.*.update`,
      `databases.${databaseId}.tables.ratecard_deliverable_validations.rows.*.create`,
    ],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/release-escrow",
  },
  {
    $id: "reconcile-release-escrow",
    name: "Reconcile Release Escrow",
    runtime: "node-22",
    execute: [],
    events: [],
    schedule: "*/15 * * * *",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/reconcile-release-escrow",
  },
  {
    $id: "send-chat-notification",
    name: "Send Chat Notification",
    runtime: "node-22",
    execute: [],
    events: [`databases.${databaseId}.tables.messages.rows.*.create`],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/send-chat-notification",
  },
  // ── Tulis lintas-user (Sprint 8) ──────────────────────────────────────────
  //
  // Mutation berikut ada di server BUKAN karena agregasi, tapi karena Appwrite
  // melarang klien memasang permission untuk user LAIN: dari sesi browser
  // `permissions` hanya boleh menyebut `any`, `users`, dan role diri sendiri.
  // Sementara `conversations`, `messages`, `offers`, `campaign_submissions`,
  // `campaign_claims`, dan `deliverables` tidak punya izin baca/tulis yang
  // dibutuhkan di level koleksi, jadi
  // lawan bicara HANYA bisa mengaksesnya lewat permission per-baris.
  //
  // Dua syarat itu tidak bisa dipenuhi bersamaan dari browser. Jangan
  // memindahkan logikanya kembali ke `src/services/` — yang akan terjadi cuma
  // `AppwriteException: Permissions must be one of: (...)` lagi.
  {
    $id: "create-conversation",
    name: "Create Conversation",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "create-conversation/src/main.js",
    commands: "cd create-conversation && npm install",
    path: "../functions",
  },
  {
    $id: "send-message",
    name: "Send Message",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/send-message",
  },
  {
    $id: "mark-conversation-read",
    name: "Mark Conversation Read",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/mark-conversation-read",
  },
  {
    $id: "mark-notifications-read",
    name: "Mark Notifications Read",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/mark-notifications-read",
  },
  {
    $id: "patch-conversation-archive",
    name: "Patch Conversation Archive",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/patch-conversation-archive",
  },
  {
    $id: "create-offer",
    name: "Create Offer",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "create-offer/src/main.js",
    commands: "cd create-offer && npm install",
    path: "../functions",
  },
  // ── Fix SEC-H1: guard campaign money fields (2026-08-08) ──────────────────
  // Campaign row tidak lagi punya Permission.update dari browser.
  // Semua mutasi field draft dan status disalurkan lewat dua Function ini.
  {
    $id: "patch-campaign-draft",
    name: "Patch Campaign Draft",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/patch-campaign-draft",
  },
  {
    $id: "patch-campaign-status",
    name: "Patch Campaign Status",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/patch-campaign-status",
  },
  {
    $id: "review-submission",
    name: "Review Submission",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/review-submission",
  },
  {
    $id: "review-withdrawal",
    name: "Review Withdrawal",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/review-withdrawal",
  },
  {
    $id: "unclaim-campaign",
    name: "Unclaim Campaign",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/unclaim-campaign",
  },
  {
    $id: "submit-campaign-proof",
    name: "Submit Campaign Proof",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/submit-campaign-proof",
  },
  {
    $id: "submit-ratecard-deliverable",
    name: "Submit Rate Card Deliverable",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/submit-ratecard-deliverable",
  },
  {
    $id: "request-ratecard-revision",
    name: "Request Rate Card Revision",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/request-ratecard-revision",
  },
  // ── Admin read DTO (P3 campaign/admin bugfix) ─────────────────────────────
  // Browser hanya mengeksekusi Function. Authorization + database join tetap
  // di server agar collection permission tidak perlu diperlebar.
  {
    $id: "get-admin-submission-queue",
    name: "Get Admin Submission Queue",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-admin-submission-queue",
  },
  {
    $id: "get-admin-ratecard-deliverable-queue",
    name: "Get Admin Rate Card Deliverable Queue",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-admin-ratecard-deliverable-queue",
  },
  {
    $id: "review-ratecard-deliverable",
    name: "Review Rate Card Deliverable",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/review-ratecard-deliverable",
  },
  {
    $id: "get-admin-withdrawal-queue",
    name: "Get Admin Withdrawal Queue",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-admin-withdrawal-queue",
  },
  {
    $id: "get-admin-dashboard-summary",
    name: "Get Admin Dashboard Summary",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-admin-dashboard-summary",
  },
  // ── Function DTO baca (Sprint 1 / s1-appwrite-read) ────────────────────────
  // Agregasi & join yang tidak bisa dipetakan setia dari satu collection.
  // Kontrak: docs/marketiv-md/database/08-frontend-data-contract.md §6, §15, §28.
  {
    $id: "get-umkm-dashboard-summary",
    name: "Get UMKM Dashboard Summary",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-umkm-dashboard-summary",
  },
  {
    $id: "get-umkm-finance-summary",
    name: "Get UMKM Finance Summary",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-umkm-finance-summary",
  },
  {
    $id: "get-umkm-profile",
    name: "Get UMKM Profile",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-umkm-profile",
  },
  {
    $id: "get-creator-directory",
    name: "Get Creator Directory",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-creator-directory",
  },
  // ── Function DTO baca (Sprint 2 / s2-appwrite-read) ────────────────────────
  // Sisi kreator. Tiga di antaranya wajib lewat Function karena `escrows` dan
  // `notifications` tidak terbaca klien, dan agregasi metrik melanggar §9.
  {
    $id: "get-creator-profile",
    name: "Get Creator Profile",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-creator-profile",
  },
  {
    $id: "get-creator-dashboard-summary",
    name: "Get Creator Dashboard Summary",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-creator-dashboard-summary",
  },
  {
    $id: "get-creator-negotiations",
    name: "Get Creator Negotiations",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-creator-negotiations",
  },
  {
    // Pasangan sisi UMKM dari get-creator-negotiations. Join-nya identik;
    // yang berbeda hanya filter peserta, profil lawan bicara, dan semantik
    // fee (seller-side, ADR-008 — UMKM bayar penuh, fee 0).
    $id: "get-umkm-negotiations",
    name: "Get Umkm Negotiations",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-umkm-negotiations",
  },
  {
    // Read model khusus review Rate Card. Order adalah aggregate root karena satu
    // conversation dapat mempunyai beberapa offer dan beberapa order.
    $id: "get-umkm-ratecard-reviews",
    name: "Get Umkm Ratecard Reviews",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/get-umkm-ratecard-reviews",
  },
  {
    // Satu Function, dua event: keduanya butuh join yang sama (baris →
    // orders → pihak lawan) dan menulis ke tabel yang sama. Memecahnya jadi
    // dua Function berarti dua deployment dan dua tempat yang harus diingat
    // saat skema berubah.
    $id: "notify-order-activity",
    name: "Notify Order Activity",
    runtime: "node-22",
    execute: [],
    events: [
      `databases.${databaseId}.tables.deliverables.rows.*.create`,
      `databases.${databaseId}.tables.revisions.rows.*.create`,
    ],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/notify-order-activity",
  },
  {
    $id: "refund-escrow",
    name: "Refund Escrow",
    runtime: "node-22",
    execute: [],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/refund-escrow",
  },
  {
    $id: "refund-order",
    name: "Refund Order",
    runtime: "node-22",
    execute: [],
    events: ["databases.6a4c8598001da3b0d7f0.tables.orders.rows.*.update"],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/refund-order",
  },
  {
    $id: "cancel-payment",
    name: "Cancel Payment",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/cancel-payment",
  },
  {
    $id: "cancel-order",
    name: "Cancel Order",
    runtime: "node-22",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/cancel-order",
  },
  {
    $id: "fee-rate-flip",
    name: "Fee Rate Flip Monitor",
    runtime: "node-22",
    execute: [],
    events: [],
    schedule: "0 0 * * *",
    timeout: 30,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/fee-rate-flip",
  },
  {
    $id: "track-order-review",
    name: "track-order-review",
    runtime: "node-22",
    execute: [],
    events: [`databases.${databaseId}.tables.deliverables.rows.*.create`],
    schedule: "",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/track-order-review",
  },
  {
    $id: "sync-order-revision",
    name: "Sync Order Revision",
    runtime: "node-22",
    execute: [],
    // Retired: request-ratecard-revision is sole writer for revision state.
    events: [],
    schedule: "",
    timeout: 15,
    enabled: false,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/sync-order-revision",
  },
  {
    $id: "auto-approve-orders",
    name: "auto-approve-orders",
    runtime: "node-22",
    execute: [],
    events: [],
    schedule: "0 * * * *",
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: "src/main.js",
    commands: "npm install",
    path: "../functions/auto-approve-orders",
  },
];

const appwriteConfigPath = path.join(__dirname, "..", "appwrite.config.json");
const appwriteCliConfigPath = path.join(__dirname, "..", "appwrite.json");

// Scopes menentukan hak dynamic API key (`x-appwrite-key`) tiap Function. Kalau
// key ini tidak ikut ditulis ke appwrite.config.json, `appwrite push functions`
// — yang punya replace-semantics — akan MENGOSONGKAN scopes di Appwrite, dan
// setiap panggilan `databases.*` di dalam Function balik 401 secara senyap.
// Itu yang terjadi pada 8 Function event-driven di commit dd41686.
// function-scopes.json tetap satu-satunya sumber kebenaran; di sini ia hanya
// disalin ke config supaya push membawanya.
const functionScopesPath = path.join(__dirname, "function-scopes.json");
const functionScopes = JSON.parse(fs.readFileSync(functionScopesPath, "utf-8"));
const requiredFunctionFiles = ["package.json", path.join("src", "main.js")];

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function findDuplicates(items) {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) || 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([item, count]) => `${item} (${count}x)`);
}

function readFunctionDirectories() {
  const functionsRoot = path.join(__dirname, "..", "functions");
  return fs
    .readdirSync(functionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .filter((name) =>
      requiredFunctionFiles.every((relPath) =>
        fs.existsSync(path.join(functionsRoot, name, relPath)),
      ),
    )
    .sort();
}

function failInventory(label, ids) {
  if (!ids.length) return;
  throw new Error(`${label}:\n- ${ids.join("\n- ")}`);
}

const functionDirectories = readFunctionDirectories();
const generatorIds = functions.map((fn) => fn.$id);
const generatorDuplicates = findDuplicates(generatorIds);
const scopeIds = Object.keys(functionScopes).sort();
const scopeDuplicates = findDuplicates(scopeIds);
const missingInGenerator = functionDirectories.filter(
  (id) => !generatorIds.includes(id),
);
const missingSourceForGenerator = generatorIds.filter(
  (id) => !functionDirectories.includes(id),
);
const missingScopes = generatorIds.filter((id) => !(id in functionScopes));
const scopeEntriesWithoutDir = scopeIds.filter(
  (id) => !functionDirectories.includes(id),
);

failInventory("Duplicate function ID di generator", generatorDuplicates);
failInventory("Duplicate function ID di function-scopes.json", scopeDuplicates);
failInventory("Function folder belum masuk generator", missingInGenerator);
failInventory(
  "Generator punya function tanpa source dir",
  missingSourceForGenerator,
);
failInventory("Function belum punya scope", missingScopes);
failInventory(
  "function-scopes.json punya function tanpa source dir",
  scopeEntriesWithoutDir,
);

const existingConfig =
  readJsonIfExists(appwriteConfigPath) ||
  readJsonIfExists(appwriteCliConfigPath) ||
  {};

const config = {
  projectId: existingConfig.projectId,
  projectName: existingConfig.projectName,
  endpoint: existingConfig.endpoint || "https://sgp.cloud.appwrite.io/v1",
  tablesDB: [
    {
      $id: databaseId,
      name: databaseName,
    },
  ],
  tables,
  buckets,
  functions: functions.map((fn) => ({
    ...fn,
    scopes: functionScopes[fn.$id],
    path: fn.path.replace("../", ""),
  })),
};
fs.writeFileSync(appwriteConfigPath, JSON.stringify(config, null, 2));
console.log(`Successfully generated ${appwriteConfigPath}`);
