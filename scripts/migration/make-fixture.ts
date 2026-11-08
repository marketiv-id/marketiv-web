/**
 * Buat fixture SINTETIS berbentuk hasil `export-appwrite.ts` (32 tabel + akun Auth).
 * Tanpa data asli: email @example.test, tanpa hash password.
 *
 * Dipakai untuk menguji skema + loader tanpa akses Appwrite:
 *   node make-fixture.ts --out .data/fixture-clean
 *   node make-fixture.ts --out .data/fixture-anomali --anomalies
 *
 * Mode bersih: semua baris harus termuat (0 ditolak).
 * Mode --anomalies: menambah baris rusak yang HARUS ditolak/dicatat loader;
 * daftar dan alasan yang diharapkan ada di EXPECTED_ANOMALIES (ditulis ke expected.json).
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { CAMPAIGN_BRIEFS_V2_ID } from "./mapping.ts";

const { values: args } = parseArgs({
  options: { out: { type: "string" }, anomalies: { type: "boolean", default: false } },
});
if (!args.out) throw new Error("--out <dir> wajib");
const outDir = path.resolve(args.out);
fs.mkdirSync(path.join(outDir, "tables"), { recursive: true });
fs.mkdirSync(path.join(outDir, "auth"), { recursive: true });

const T0 = Date.parse("2026-09-01T00:00:00.000Z");
let tick = 0;
const ts = () => new Date(T0 + tick++ * 3_600_000).toISOString();
const sys = (id: string) => {
  const t = ts();
  return { $id: id, $createdAt: t, $updatedAt: t, $permissions: [] as string[] };
};

const tables: Record<string, Record<string, unknown>[]> = {};
const add = (table: string, row: Record<string, unknown>) => (tables[table] ??= []).push(row);

// --- Akun Auth -------------------------------------------------------------
const AUTH = {
  umkm1: "aw_umkm_1",
  umkm2: "aw_umkm_2",
  creator1: "aw_creator_1",
  creator2: "aw_creator_2",
  admin: "aw_admin_1",
  noProfile: "aw_auth_tanpa_users", // audit A5: akun Auth tanpa baris users
};
const authUsers = Object.entries(AUTH).map(([key, id]) => ({
  ...sys(id),
  name: `Fixture ${key}`,
  email: `${key.toLowerCase()}@example.test`,
  emailVerification: key !== "creator2",
  status: true,
  labels: [],
  prefs: {},
  password: null, // sengaja tanpa hash
}));

// --- users ------------------------------------------------------------------
const userRow = (rowId: string, authId: string, role: string, email: string) => ({
  ...sys(rowId),
  userId: authId,
  role,
  status: "active",
  email,
  phone: null,
  address: null,
  createdAt: null,
  tos_version: "v1",
  tos_accepted_at: ts(),
  kyc_status: role === "creator" ? "none" : null,
});
add("users", userRow("row_u1", AUTH.umkm1, "umkm", "umkm1@example.test"));
add("users", userRow("row_u2", AUTH.umkm2, "umkm", "umkm2@example.test"));
add("users", userRow("row_c1", AUTH.creator1, "creator", "creator1@example.test"));
add("users", userRow("row_c2", AUTH.creator2, "creator", "creator2@example.test"));
add("users", userRow("row_a1", AUTH.admin, "ADMIN", "admin@example.test")); // kapital → dinormalisasi

// --- profil -----------------------------------------------------------------
for (const [i, u] of [AUTH.umkm1, AUTH.umkm2].entries()) {
  add("umkm_profiles", {
    ...sys(`umkm_prof_${i + 1}`),
    userId: u,
    businessName: `Warung ${i + 1}`,
    category: i === 0 ? "kuliner" : "",
    city: "Bandung",
    isProfileCompleted: i === 0,
    logoUrl: null,
  });
  add("wallets", { ...sys(`wallet_u${i + 1}`), userId: u, balance: 0, pendingBalance: 0 });
  add("user_storage_usage", { ...sys(`usage_u${i + 1}`), userId: u, usedBytes: 0, quotaBytes: 104857600, fileCount: 0 });
}
for (const [i, u] of [AUTH.creator1, AUTH.creator2].entries()) {
  add("creator_profiles", {
    ...sys(`creator_prof_${i + 1}`),
    userId: u,
    displayName: `Kreator ${i + 1}`,
    niche: i === 0 ? "Kuliner" : null, // kapital → dinormalisasi
    totalFollowers: 1200,
    totalOrders: 0,
    rating: 4.5,
    isProfileCompleted: true,
  });
  add("creator_social_accounts", {
    ...sys(`social_c${i + 1}`),
    creatorId: u,
    platform: "tiktok",
    username: `kreator${i + 1}`,
    followers: 1200,
    engagementRate: 3.25,
  });
  add("wallets", { ...sys(`wallet_c${i + 1}`), userId: u, balance: 150000, pendingBalance: 25000 });
}
add("creator_portfolios", { ...sys("porto_1"), creatorId: AUTH.creator1, title: "Video kuliner", portfolioUrl: "https://example.test/p/1" });
add("user_files", {
  ...sys("ufile_1"),
  userId: AUTH.creator1,
  storageFileId: "file_1",
  bucketId: "user-files",
  fileName: "bukti.png",
  mimeType: "image/png",
  sizeBytes: 2048,
  status: "active",
  createdAt: ts(),
});
add("appeals", {
  ...sys("appeal_1"),
  userId: AUTH.creator2,
  actionRef: "suspend:1",
  reason: "Salah paham",
  deadlineAt: ts(),
  slaDecidedAt: ts(),
  status: "submitted",
});
add("otp_rate_limits", { ...sys("otp_1"), key: "k".repeat(64), email: "umkm1@example.test", ip: "10.0.0.1", count: 2, windowStart: ts(), updatedAt: ts() });
add("ai_requests", { ...sys("ai_1"), userId: AUTH.umkm1, feature: "brief", prompt: "Buat brief", response: "{}", createdAt: ts() });
add("notifications", { ...sys("ntf0001"), userId: AUTH.creator1, title: "Halo", message: "Selamat datang", type: "system", isRead: false, createdAt: ts() });

// --- campaign ---------------------------------------------------------------
add("campaigns", {
  ...sys("camp_1"),
  umkmId: AUTH.umkm1,
  title: "Promo bakso",
  category: "kuliner",
  type: "ugc",
  platforms: ["tiktok"],
  budget: 500000,
  rewardPer1000Views: 5000,
  status: "active",
  claimLimit: 10,
  submissionDays: 7,
  totalClaims: 1,
  spentAmount: 10000,
  remainingBudget: 490000,
  publishedAt: ts(),
  thumbnailUrl: "",
});
add("campaigns", {
  ...sys("camp_2"),
  umkmId: AUTH.umkm2,
  title: "Draft",
  category: "fashion",
  type: "clipping",
  platforms: ["tiktok"],
  budget: 0,
  rewardPer1000Views: 0,
  status: "draft",
  claimLimit: 0,
});
add("campaign_briefs", { ...sys("brief_old_1"), campaignId: "camp_1", objective: "lama", doAndDont: null, generatedByAi: false });
add(CAMPAIGN_BRIEFS_V2_ID, {
  ...sys("brief_v2_1"),
  campaignId: "camp_1",
  objective: "baru",
  doAndDont: JSON.stringify({ do: ["Sebut nama warung"], dont: ["Jangan kasar"] }),
  materialsJson: null,
  generatedByAi: true,
});
add(CAMPAIGN_BRIEFS_V2_ID, { ...sys("brief_v2_2"), campaignId: "camp_2", objective: "draft", doAndDont: "" });
add("campaign_assets", { ...sys("asset_1"), campaignId: "camp_1", source: "external", type: "link", fileUrl: "https://example.test/a" });
add("campaign_claims", { ...sys("claim_1"), campaignId: "camp_1", creatorId: AUTH.creator1, status: "submitted", claimedAt: ts() });
add("campaign_claims", { ...sys("claim_2"), campaignId: "camp_1", creatorId: AUTH.creator2, status: "expired", claimedAt: ts() });
add("campaign_submissions", {
  ...sys("sub_1"),
  claimId: "claim_1",
  campaignId: "camp_1",
  creatorId: AUTH.creator1,
  platform: "TikTok",
  postUrl: "https://example.test/v/1",
  views: 2000,
  views_source: "manual_admin",
  fraudStatus: "safe",
  status: "approved",
});
add("fraud_checks", { ...sys("fraud_1"), submissionId: "sub_1", score: 10, result: "safe", createdAt: ts() });

// --- rate card, chat, order ---------------------------------------------------
add("rate_cards", { ...sys("rc_1"), creatorId: AUTH.creator1, title: "Paket video", status: "published", createdAt: ts() });
add("rate_card_packages", {
  ...sys("pkg_1"),
  rateCardId: "rc_1",
  name: "Basic",
  description: "1 video",
  output: "1 video 30 detik",
  deliveryDays: 3,
  price: 300000,
  revisionLimit: 2,
});
add("conversations", { ...sys("conv_1"), umkm_id: AUTH.umkm1, creator_id: AUTH.creator1, offer_id: "offer_1", last_message: "Deal" });
add("offers", {
  ...sys("offer_1"),
  conversationId: "conv_1",
  umkmId: AUTH.umkm1,
  creatorId: AUTH.creator1,
  title: "Video bakso",
  price: 300000,
  deadline: "2026-12-01", // hanya tanggal → lenient
  revisionLimit: 2,
  packageId: "pkg_1",
  packageNameSnapshot: "Basic",
  packagePriceSnapshot: 300000,
  status: "accepted",
  createdAt: ts(),
});
add("messages", { ...sys("msg_1"), conversation_id: "conv_1", sender_id: AUTH.umkm1, message_type: "text", content: "Halo" });
add("messages", { ...sys("msg_2"), conversation_id: "conv_1", sender_id: AUTH.umkm1, message_type: "offer", offer_id: "offer_1" });
add("orders", {
  ...sys("order_1"),
  offerId: "offer_1",
  packageId: "pkg_1",
  creatorId: AUTH.creator1,
  umkmId: AUTH.umkm1,
  amount: 300000,
  status: "in_progress",
  revision_count: 0,
  revision_limit: 2,
  createdAt: ts(),
});
add("deliverables", { ...sys("deliv_1"), orderId: "order_1", source: "external_url", fileUrl: "https://example.test/d", version: 1, status: "submitted", createdAt: ts() });
add("revisions", { ...sys("rev_1"), orderId: "order_1", requestedBy: AUTH.umkm1, message: "Tambah logo", status: "open" });
add("ratecard_deliverable_validations", {
  ...sys("val_1"),
  deliverableId: "deliv_1",
  orderId: "order_1",
  deliverableVersion: 1,
  sourceSnapshot: "external_url",
  evidenceUrlSnapshot: "https://example.test/d",
  status: "valid",
  reviewedBy: AUTH.admin,
  reviewedAt: ts(),
});

// --- keuangan -----------------------------------------------------------------
add("payments", {
  ...sys("pay_1"),
  user_id: AUTH.umkm1,
  order_id: "order_1",
  order_payment_key: "order:order_1",
  amount: 300000,
  total_amount: 306000,
  fee_amount: 6000,
  purpose: "order",
  gateway: "midtrans",
  gateway_reference: "MKT-order_1",
  status: "paid",
  paid_at: ts(),
});
add("payments", {
  ...sys("pay_2"),
  user_id: AUTH.umkm1,
  campaign_id: "camp_1",
  amount: 500000,
  total_amount: 500000,
  purpose: "campaign",
  gateway_reference: "MKT-camp_1",
  status: "paid",
  paid_at: ts(),
});
add("escrows", { ...sys("escrow_1"), orderId: "order_1", amount: 300000, status: "held", fee_rate: 0.02 });
add("transactions", { ...sys("tx" + "a".repeat(32)), userId: AUTH.umkm1, amount: 300000, type: "payment", referenceId: "order_1", referenceType: "order", status: "completed" });
add("transactions", { ...sys("tx" + "b".repeat(32)), userId: AUTH.creator1, amount: 10000, type: "release", referenceId: "sub_1", referenceType: "campaign_submission", status: "matured" });
add("withdrawals", {
  ...sys("wd_1"),
  userId: AUTH.creator1,
  amount: 50000,
  payoutMethod: "bank",
  providerName: "BCA",
  accountNumber: "0000000000",
  accountName: "Kreator Satu",
  status: "requested",
  requester_role: "creator",
  source_origin: "creator",
  kyc_status: "verified",
});
add("transactions", { ...sys("tx" + "c".repeat(32)), userId: AUTH.creator1, amount: 50000, type: "withdrawal", referenceId: "wd_1", referenceType: "withdrawal", status: "pending" });

// --- anomali ------------------------------------------------------------------
const EXPECTED_ANOMALIES: { table: string; id: string; expect: string }[] = [];
if (args.anomalies) {
  const bad = (table: string, row: Record<string, unknown>, expect: string) => {
    add(table, row);
    EXPECTED_ANOMALIES.push({ table, id: String(row.$id), expect });
  };
  bad("users", userRow("row_ghost", "aw_tidak_ada", "creator", "ghost@example.test"), "akun_auth_tidak_ada");
  bad("notifications", { ...sys("ntf_ghost"), userId: "aw_tidak_ada", title: "x", message: "x", type: "system" }, "user_tidak_dikenal:user_id");
  bad("creator_social_accounts", { ...sys("social_dup"), creatorId: AUTH.creator1, platform: "tiktok", username: "dobel" }, "unique_violation:creator_social_accounts_creator_id_platform_key");
  bad("campaigns", { ...sys("camp_bad_status"), umkmId: AUTH.umkm1, title: "x", category: "x", type: "ugc", platforms: ["tiktok"], budget: 0, rewardPer1000Views: 0, status: "Aktif", claimLimit: 0 }, "check_violation:campaigns_status_check");
  bad("campaign_assets", { ...sys("asset_orphan"), campaignId: "camp_tidak_ada", source: "external", type: "link", fileUrl: "https://example.test/x" }, "fk_violation:campaign_assets_campaign_id_fkey");
  bad("offers", { ...sys("offer_bad_deadline"), conversationId: "conv_1", umkmId: AUTH.umkm1, creatorId: AUTH.creator1, title: "x", price: 1, deadline: "besok", revisionLimit: 0, status: "pending" }, "tanggal_tidak_valid");
  bad("withdrawals", { ...sys("wd_legacy"), userId: AUTH.creator2, amount: 1, payoutMethod: "bank", providerName: "x", accountNumber: "1", accountName: "x", status: "processed" }, "check_violation:withdrawals_status_check");
  bad("transactions", { ...sys("tx_dup_release"), userId: AUTH.creator1, amount: 10000, type: "release", referenceId: "sub_1", referenceType: "campaign_submission", status: "matured" }, "unique_violation:transactions_reference_type_reference_id_type_key");
  bad("wallets", { ...sys("wallet_negative"), userId: AUTH.admin, balance: -5, pendingBalance: 0 }, "check_violation:wallets_balance_check");
}

// --- tulis ----------------------------------------------------------------------
const ALL_TABLES = [
  "users", "appeals", "otp_rate_limits", "umkm_profiles", "creator_profiles", "creator_social_accounts",
  "creator_portfolios", "user_storage_usage", "user_files", "campaigns", "campaign_assets", "fraud_checks",
  "campaign_briefs", CAMPAIGN_BRIEFS_V2_ID, "campaign_claims", "campaign_submissions", "rate_cards",
  "rate_card_packages", "conversations", "messages", "offers", "orders", "deliverables", "revisions",
  "ratecard_deliverable_validations", "wallets", "payments", "transactions", "escrows", "withdrawals",
  "notifications", "ai_requests",
];
const manifest = { target: "fixture", anomalies: args.anomalies, tables: {} as Record<string, { name: string; rows: number }>, authUsers: authUsers.length };
for (const t of ALL_TABLES) {
  const rows = tables[t] ?? [];
  fs.writeFileSync(path.join(outDir, "tables", `${t}.jsonl`), rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
  manifest.tables[t] = { name: t === CAMPAIGN_BRIEFS_V2_ID ? "campaign_briefs_v2" : t, rows: rows.length };
}
fs.writeFileSync(path.join(outDir, "auth", "users.jsonl"), authUsers.map((u) => JSON.stringify(u)).join("\n") + "\n");
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(outDir, "expected.json"), JSON.stringify(EXPECTED_ANOMALIES, null, 2));
console.log(JSON.stringify({ outDir, tables: ALL_TABLES.length, rows: Object.values(manifest.tables).reduce((n, t) => n + t.rows, 0), anomalies: EXPECTED_ANOMALIES.length }));
