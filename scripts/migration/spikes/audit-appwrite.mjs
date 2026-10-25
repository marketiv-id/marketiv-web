/**
 * Audit read-only data live Appwrite untuk Fase 0 migrasi Supabase.
 *
 * READ-ONLY: hanya GET. Tidak menulis ke Appwrite.
 * Output tanpa PII: hanya angka, ID, status. Email/nama/URL tidak pernah ditulis ke laporan.
 * Daftar email admin (untuk validasi manual pemilik) ditulis TERPISAH ke --private-out,
 * yang wajib berada di luar repo.
 *
 * Env: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID
 *
 *   NODE_USE_ENV_PROXY=1 node audit-appwrite.mjs \
 *     --out ../../../docs/marketiv-supabase-migration-v1/audit/2026-10-25-appwrite-prod.json \
 *     --private-out /path/di/luar/repo/admin-candidates.json
 *
 * Semantik uang mengikuti Functions lama (00_BACKEND/functions): lihat bagian WALLET.
 */
import fs from "node:fs";
import path from "node:path";
import { appwriteClient, nowIso } from "./_lib.mjs";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
};
const OUT = arg("--out");
const PRIVATE_OUT = arg("--private-out");
if (PRIVATE_OUT && path.resolve(PRIVATE_OUT).startsWith(path.resolve(new URL("../../..", import.meta.url).pathname))) {
  throw new Error("--private-out tidak boleh berada di dalam repo (berisi PII).");
}

const aw = appwriteClient("prod");
const DB = aw.databaseId;
if (!DB) throw new Error("APPWRITE_DATABASE_ID wajib diset.");

const report = {
  generatedAt: nowIso(),
  source: { endpoint: aw.endpoint, projectId: aw.project, databaseId: DB },
  counts: {},
  storage: {},
  auth: {},
  orphans: [],
  campaignAssetsBucket: {},
  admins: {},
  campaigns: {},
  wallets: {},
  ledger: {},
  escrows: {},
  payments: {},
  withdrawals: {},
  urlColumns: {},
  anomalies: [],
};
const anomaly = (id, severity, gap, summary, ids = []) =>
  report.anomalies.push({ id, severity, gap, summary, count: ids.length || undefined, ids: ids.slice(0, 50) });

// ── Load ────────────────────────────────────────────────────────────────────
const tablesMeta = await aw.listAll(`/tablesdb/${DB}/tables`, "tables");
const T = {};
for (const t of tablesMeta) {
  T[t.$id] = await aw.listAll(`/tablesdb/${DB}/tables/${t.$id}/rows`, "rows");
  report.counts[t.$id] = T[t.$id].length;
}
const rows = (id) => T[id] || [];
const authUsers = await aw.listAll("/users", "users");
const buckets = await aw.listAll("/storage/buckets", "buckets");
const files = {};
for (const b of buckets) files[b.$id] = await aw.listAll(`/storage/buckets/${b.$id}/files`, "files");

// ── Storage ─────────────────────────────────────────────────────────────────
const FREE_LIMIT = 50_000_000;
for (const b of buckets) {
  const list = files[b.$id];
  const sizes = list.map((f) => f.sizeOriginal || 0);
  const mimes = {};
  for (const f of list) mimes[f.mimeType || "?"] = (mimes[f.mimeType || "?"] || 0) + 1;
  report.storage[b.$id] = {
    files: list.length,
    totalBytes: sizes.reduce((a, s) => a + s, 0),
    maxBytes: sizes.length ? Math.max(...sizes) : 0,
    overFreeLimit50MB: sizes.filter((s) => s > FREE_LIMIT).length,
    bucketMaxFileSize: b.maximumFileSize,
    fileSecurity: b.fileSecurity,
    bucketPermissions: b.$permissions,
    mimeTypes: mimes,
  };
}
const fileIndex = new Map(); // `${bucket}/${fileId}` → file
for (const [bid, list] of Object.entries(files)) for (const f of list) fileIndex.set(`${bid}/${f.$id}`, f);

// ── Auth users ──────────────────────────────────────────────────────────────
const authIds = new Set(authUsers.map((u) => u.$id));
const hashShapes = {};
for (const u of authUsers) {
  const params = typeof u.password === "string" ? (u.password.split("$")[3] || "") : "";
  const key = u.password ? `${u.hash}:${params}` : "(tanpa password)";
  hashShapes[key] = (hashShapes[key] || 0) + 1;
}
const prefsRoles = {};
for (const u of authUsers) {
  const r = u.prefs?.role ?? "(kosong)";
  prefsRoles[r] = (prefsRoles[r] || 0) + 1;
}
// Baris `users` punya $id sendiri; relasi ke Auth lewat kolom `userId`.
const usersRowsById = new Map(rows("users").map((r) => [r.userId, r]));
report.auth = {
  total: authUsers.length,
  hashAlgorithms: hashShapes,
  withoutPassword: authUsers.filter((u) => !u.password).length,
  emailVerified: authUsers.filter((u) => u.emailVerification).length,
  disabled: authUsers.filter((u) => u.status === false).length,
  withLabels: authUsers.filter((u) => (u.labels || []).length).length,
  prefsRole: prefsRoles,
  usersTableRoles: rows("users").reduce((m, r) => ({ ...m, [r.role]: (m[r.role] || 0) + 1 }), {}),
  usersTableStatus: rows("users").reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {}),
  authWithoutUsersRow: authUsers.filter((u) => !usersRowsById.has(u.$id)).map((u) => u.$id),
  usersRowWithoutAuth: rows("users").filter((r) => !authIds.has(r.userId)).map((r) => r.$id),
  usersRowIdNeUserId: rows("users").filter((r) => r.userId && r.userId !== r.$id).length,
  duplicateUsersRowsPerAuth: [...rows("users").reduce((m, r) => m.set(r.userId, (m.get(r.userId) || 0) + 1), new Map())]
    .filter(([, n]) => n > 1).map(([u]) => u),
  prefsRoleNeUsersRole: authUsers
    .filter((u) => usersRowsById.has(u.$id) && u.prefs?.role && u.prefs.role !== usersRowsById.get(u.$id).role)
    .map((u) => u.$id),
};
if (report.auth.usersRowWithoutAuth.length)
  anomaly("users-row-without-auth", "warn", null, "Baris `users` tanpa akun Auth.", report.auth.usersRowWithoutAuth);
if (report.auth.authWithoutUsersRow.length)
  anomaly("auth-without-users-row", "info", null, "Akun Auth tanpa baris `users` (onboarding tidak selesai).", report.auth.authWithoutUsersRow);
if (report.auth.duplicateUsersRowsPerAuth.length)
  anomaly("users-row-duplicate", "warn", null, "Lebih dari satu baris `users` untuk satu akun Auth.", report.auth.duplicateUsersRowsPerAuth);
if (report.auth.prefsRoleNeUsersRole.length)
  anomaly("prefs-role-mismatch", "warn", "#5", "`prefs.role` berbeda dengan `users.role`.", report.auth.prefsRoleNeUsersRole);

// ── Orphans (FK implisit) ───────────────────────────────────────────────────
const idsOf = (t) => new Set(rows(t).map((r) => r.$id));
const target = {
  auth: authIds,
  campaigns: idsOf("campaigns"),
  campaign_claims: idsOf("campaign_claims"),
  campaign_submissions: idsOf("campaign_submissions"),
  rate_cards: idsOf("rate_cards"),
  rate_card_packages: idsOf("rate_card_packages"),
  conversations: idsOf("conversations"),
  offers: idsOf("offers"),
  orders: idsOf("orders"),
  deliverables: idsOf("deliverables"),
  withdrawals: idsOf("withdrawals"),
  escrows: idsOf("escrows"),
  payments: idsOf("payments"),
};
const REL = [
  ["users", "userId", "auth"],
  ["appeals", "userId", "auth"],
  ["umkm_profiles", "userId", "auth"],
  ["creator_profiles", "userId", "auth"],
  ["creator_social_accounts", "creatorId", "auth"],
  ["creator_portfolios", "creatorId", "auth"],
  ["user_storage_usage", "userId", "auth"],
  ["user_files", "userId", "auth"],
  ["campaigns", "umkmId", "auth"],
  ["campaign_assets", "campaignId", "campaigns"],
  ["campaign_briefs", "campaignId", "campaigns"],
  ["6ab530d00018edb50097", "campaignId", "campaigns"],
  ["campaign_claims", "campaignId", "campaigns"],
  ["campaign_claims", "creatorId", "auth"],
  ["campaign_submissions", "claimId", "campaign_claims"],
  ["campaign_submissions", "campaignId", "campaigns"],
  ["campaign_submissions", "creatorId", "auth"],
  ["fraud_checks", "submissionId", "campaign_submissions"],
  ["rate_cards", "creatorId", "auth"],
  ["rate_card_packages", "rateCardId", "rate_cards"],
  ["conversations", "umkm_id", "auth"],
  ["conversations", "creator_id", "auth"],
  ["conversations", "offer_id", "offers"],
  ["messages", "conversation_id", "conversations"],
  ["messages", "sender_id", "auth"],
  ["messages", "offer_id", "offers"],
  ["offers", "conversationId", "conversations"],
  ["offers", "umkmId", "auth"],
  ["offers", "creatorId", "auth"],
  ["offers", "packageId", "rate_card_packages"],
  ["orders", "offerId", "offers"],
  ["orders", "packageId", "rate_card_packages"],
  ["orders", "creatorId", "auth"],
  ["orders", "umkmId", "auth"],
  ["deliverables", "orderId", "orders"],
  ["revisions", "orderId", "orders"],
  ["revisions", "requestedBy", "auth"],
  ["ratecard_deliverable_validations", "deliverableId", "deliverables"],
  ["ratecard_deliverable_validations", "orderId", "orders"],
  ["ratecard_deliverable_validations", "reviewedBy", "auth"],
  ["wallets", "userId", "auth"],
  ["payments", "user_id", "auth"],
  ["payments", "order_id", "orders"],
  ["payments", "campaign_id", "campaigns"],
  ["transactions", "userId", "auth"],
  ["escrows", "orderId", "orders"],
  ["withdrawals", "userId", "auth"],
  ["withdrawals", "processed_by", "auth"],
  ["notifications", "userId", "auth"],
  ["ai_requests", "userId", "auth"],
];
for (const [table, col, to] of REL) {
  const list = rows(table);
  const bad = list.filter((r) => r[col] != null && r[col] !== "" && !target[to].has(r[col]));
  report.orphans.push({ table, column: col, references: to, checked: list.filter((r) => r[col]).length, orphans: bad.length, ids: bad.map((r) => r.$id).slice(0, 50) });
  if (bad.length) anomaly(`orphan:${table}.${col}`, "warn", null, `${table}.${col} menunjuk ${to} yang tidak ada.`, bad.map((r) => r.$id));
}
// user_files → file storage
{
  const bad = rows("user_files").filter((r) => !fileIndex.has(`${r.bucketId}/${r.storageFileId}`));
  report.orphans.push({ table: "user_files", column: "bucketId/storageFileId", references: "storage", checked: rows("user_files").length, orphans: bad.length, ids: bad.map((r) => r.$id) });
  if (bad.length) anomaly("orphan:user_files.storage", "warn", null, "user_files menunjuk file storage yang tidak ada.", bad.map((r) => r.$id));
}
// ledger polimorfik
{
  const refTarget = { payment: "payments", escrow: "escrows", withdrawal: "withdrawals", campaign: "campaigns", campaign_submission: "campaign_submissions", order: "orders" };
  const bad = rows("transactions").filter((t) => {
    if (t.referenceType === "transaction") return !rows("transactions").some((x) => x.$id === t.referenceId);
    const to = refTarget[t.referenceType];
    return to ? !target[to].has(t.referenceId) : false;
  });
  report.orphans.push({ table: "transactions", column: "referenceType/referenceId", references: "polimorfik", checked: rows("transactions").length, orphans: bad.length, ids: bad.map((r) => r.$id) });
  if (bad.length) anomaly("orphan:transactions.reference", "warn", null, "Ledger menunjuk referensi yang tidak ada.", bad.map((r) => r.$id));
}

// ── URL kolom → file storage ────────────────────────────────────────────────
const URL_COLS = [
  ["umkm_profiles", "logoUrl"],
  ["creator_profiles", "avatarUrl"],
  ["creator_profiles", "bannerUrl"],
  ["creator_portfolios", "thumbnailUrl"],
  ["creator_portfolios", "portfolioUrl"],
  ["campaigns", "thumbnailUrl"],
  ["campaign_assets", "fileUrl"],
  ["deliverables", "fileUrl"],
  ["ratecard_deliverable_validations", "evidenceUrlSnapshot"],
];
const urlRe = /\/storage\/buckets\/([^/]+)\/files\/([^/]+)\/(?:view|download|preview)(?:\?project=([^&]+))?/;
const referencedFiles = new Set();
for (const [table, col] of URL_COLS) {
  const stat = { nonEmpty: 0, appwriteStorage: 0, external: 0, otherProject: 0, missingFile: 0, missingIds: [] };
  for (const r of rows(table)) {
    const v = r[col];
    if (!v) continue;
    stat.nonEmpty++;
    const m = String(v).match(urlRe);
    if (!m) { stat.external++; continue; }
    stat.appwriteStorage++;
    const [, bid, fid, proj] = m;
    referencedFiles.add(`${bid}/${fid}`);
    if (proj && proj !== aw.project) stat.otherProject++;
    if (!fileIndex.has(`${bid}/${fid}`)) { stat.missingFile++; stat.missingIds.push(r.$id); }
  }
  report.urlColumns[`${table}.${col}`] = stat;
  if (stat.otherProject) anomaly(`url-other-project:${table}.${col}`, "warn", null, `${table}.${col} berisi URL ke project Appwrite lain (mis. staging).`, []);
  if (stat.missingFile) anomaly(`url-missing-file:${table}.${col}`, "warn", null, `${table}.${col} menunjuk file yang tidak ada di bucket.`, stat.missingIds);
}

// ── File di bucket publik campaign-assets ──────────────────────────────────
{
  const list = files["campaign-assets"] || [];
  const privateRefs = new Set(
    [...rows("deliverables").map((d) => d.fileUrl), ...rows("ratecard_deliverable_validations").map((v) => v.evidenceUrlSnapshot)]
      .map((u) => String(u || "").match(urlRe))
      .filter(Boolean)
      .map((m) => `${m[1]}/${m[2]}`)
  );
  const userFileRefs = new Set(rows("user_files").map((r) => `${r.bucketId}/${r.storageFileId}`));
  const priv = list.filter((f) => privateRefs.has(`campaign-assets/${f.$id}`) || userFileRefs.has(`campaign-assets/${f.$id}`));
  const unreferenced = list.filter((f) => !referencedFiles.has(`campaign-assets/${f.$id}`) && !userFileRefs.has(`campaign-assets/${f.$id}`));
  const noPublicReadPerm = list.filter((f) => !(f.$permissions || []).includes('read("any")'));
  report.campaignAssetsBucket = {
    files: list.length,
    referencedByPrivateContext: priv.map((f) => f.$id),
    unreferenced: unreferenced.map((f) => f.$id),
    withoutFileLevelReadAny: noPublicReadPerm.length,
    note: "Bucket fileSecurity=false, jadi izin bucket read(any) berlaku untuk semua file terlepas dari izin per-file.",
  };
  if (priv.length) anomaly("campaign-assets-private", "high", null, "File konteks privat (deliverable/user_files) berada di bucket publik campaign-assets.", priv.map((f) => f.$id));
  if (unreferenced.length) anomaly("campaign-assets-unreferenced", "info", null, "File di campaign-assets tidak dirujuk baris mana pun (yatim).", unreferenced.map((f) => f.$id));
}

// ── Admin ───────────────────────────────────────────────────────────────────
{
  const candidates = [];
  for (const u of authUsers) {
    const row = usersRowsById.get(u.$id);
    const signals = {
      label: (u.labels || []).includes("admin"),
      prefsRole: u.prefs?.role === "admin",
      usersRole: row?.role === "admin",
    };
    if (signals.label || signals.prefsRole || signals.usersRole) candidates.push({ id: u.$id, ...signals, createdAt: u.$createdAt });
  }
  for (const r of rows("users")) {
    if (r.role === "admin" && !authIds.has(r.userId)) candidates.push({ id: r.userId, usersRowId: r.$id, label: false, prefsRole: false, usersRole: true, noAuth: true });
  }
  report.admins = {
    total: candidates.length,
    candidates,
    rule: "Admin sah = label Auth 'admin'. users.role/prefs.role bisa diubah user sendiri (celah #1/#5).",
  };
  const suspicious = candidates.filter((c) => !c.label);
  if (suspicious.length)
    anomaly("admin-without-label", "critical", "#1/#5", "Akun punya sinyal admin (users.role / prefs.role) tanpa label Auth 'admin'. Validasi manual.", suspicious.map((c) => c.id));
  if (PRIVATE_OUT) {
    const priv = candidates.map((c) => {
      const u = authUsers.find((x) => x.$id === c.id);
      return { ...c, email: u?.email ?? null, name: u?.name ?? null };
    });
    fs.mkdirSync(path.dirname(PRIVATE_OUT), { recursive: true });
    fs.writeFileSync(PRIVATE_OUT, JSON.stringify(priv, null, 2));
  }
}

// ── Campaign vs pembayaran (celah #2) ──────────────────────────────────────
{
  const paidByCampaign = new Map();
  const payByCampaign = new Map();
  for (const p of rows("payments").filter((p) => p.purpose === "campaign" && p.campaign_id)) {
    payByCampaign.set(p.campaign_id, [...(payByCampaign.get(p.campaign_id) || []), p]);
    if (p.status === "paid") paidByCampaign.set(p.campaign_id, (paidByCampaign.get(p.campaign_id) || 0) + (p.amount || 0));
  }
  const campaignRefunds = new Map();
  for (const t of rows("transactions").filter((t) => t.type === "refund" && t.referenceType === "campaign" && t.status === "completed"))
    campaignRefunds.set(t.referenceId, (campaignRefunds.get(t.referenceId) || 0) + t.amount);

  const byStatus = {};
  const list = [];
  for (const c of rows("campaigns")) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    const paid = paidByCampaign.get(c.$id) || 0;
    const funded = (c.remainingBudget || 0) + (c.spentAmount || 0) + (campaignRefunds.get(c.$id) || 0);
    list.push({
      id: c.$id,
      status: c.status,
      budget: c.budget,
      remainingBudget: c.remainingBudget ?? null,
      spentAmount: c.spentAmount ?? null,
      totalClaims: c.totalClaims ?? null,
      paidAmount: paid,
      paymentRows: (payByCampaign.get(c.$id) || []).map((p) => p.status),
      fundingGap: funded - paid,
      createdAt: c.$createdAt,
      publishedAt: c.publishedAt ?? null,
    });
  }
  report.campaigns = { byStatus, list };
  const live = ["active", "paused", "completed"];
  const unfunded = list.filter((c) => live.includes(c.status) && c.paidAmount === 0);
  const overfunded = list.filter((c) => c.fundingGap > 0);
  const zeroBudgetLive = list.filter((c) => live.includes(c.status) && !c.budget);
  if (unfunded.length) anomaly("campaign-live-without-paid-payment", "critical", "#2", "Campaign active/paused/completed tanpa payment `paid`.", unfunded.map((c) => c.id));
  if (overfunded.length) anomaly("campaign-budget-exceeds-paid", "critical", "#2", "remainingBudget + spentAmount + refund > total payment paid.", overfunded.map((c) => c.id));
  if (zeroBudgetLive.length) anomaly("campaign-live-zero-budget", "warn", "#2", "Campaign live dengan budget 0.", zeroBudgetLive.map((c) => c.id));
  const manual = rows("payments").filter((p) => String(p.$id).startsWith("manualfund") || p.gateway === "manual-dev");
  if (manual.length) anomaly("payment-manual-fund", "warn", null, "Payment dari ops fund-campaign.mjs (manual-dev).", manual.map((p) => p.$id));
}

// ── Wallet vs ledger (celah #3) ────────────────────────────────────────────
{
  const tx = rows("transactions");
  const matured = new Set(tx.filter((t) => t.type === "mature").map((t) => t.referenceId));
  const expected = new Map();
  const expectedPending = new Map();
  const add = (m, k, v) => m.set(k, (m.get(k) || 0) + v);
  for (const t of tx) {
    const a = Number(t.amount) || 0;
    if (t.type === "release" && t.referenceType === "campaign_submission") {
      if (t.status === "matured" && !matured.has(t.$id)) add(expected, t.userId, a);
      else if (t.status === "completed") add(expectedPending, t.userId, a); // reward lama yang belum matang
    } else if (t.type === "mature" && t.status === "completed") add(expected, t.userId, a);
    else if (t.type === "release" && t.referenceType === "escrow" && t.status === "completed") add(expected, t.userId, a);
    else if (t.type === "refund" && t.status === "completed") add(expected, t.userId, a);
    else if (t.type === "withdrawal_reversal" && t.status === "completed") add(expected, t.userId, a);
    else if (t.type === "withdrawal") add(expected, t.userId, -a);
  }
  const walletsByUser = new Map();
  for (const w of rows("wallets")) walletsByUser.set(w.userId, [...(walletsByUser.get(w.userId) || []), w]);
  const mismatches = [];
  for (const w of rows("wallets")) {
    const exp = expected.get(w.userId) || 0;
    const expP = expectedPending.get(w.userId) || 0;
    if ((w.balance || 0) !== exp || (w.pendingBalance || 0) !== expP)
      mismatches.push({ walletId: w.$id, userId: w.userId, balance: w.balance || 0, expectedBalance: exp, pendingBalance: w.pendingBalance || 0, expectedPending: expP });
  }
  const usersWithLedgerNoWallet = [...new Set(tx.map((t) => t.userId))].filter((u) => !walletsByUser.has(u));
  const dupWallets = [...walletsByUser.entries()].filter(([, ws]) => ws.length > 1).map(([u]) => u);
  report.wallets = {
    total: rows("wallets").length,
    sumBalance: rows("wallets").reduce((a, w) => a + (w.balance || 0), 0),
    sumPending: rows("wallets").reduce((a, w) => a + (w.pendingBalance || 0), 0),
    nonZero: rows("wallets").filter((w) => (w.balance || 0) !== 0 || (w.pendingBalance || 0) !== 0).length,
    mismatches,
    duplicateWalletsForUser: dupWallets,
    ledgerUsersWithoutWallet: usersWithLedgerNoWallet,
    formula: "balance = Σ(release.matured + mature.completed + release/escrow.completed + refund.completed + withdrawal_reversal.completed) − Σ withdrawal (semua status); pending = Σ release/campaign_submission.completed (reward lama belum matang)",
  };
  if (mismatches.length) anomaly("wallet-ne-ledger", "critical", "#3", "Saldo wallet ≠ yang diturunkan dari ledger.", mismatches.map((m) => m.walletId));
  if (dupWallets.length) anomaly("wallet-duplicate", "high", "#3", "Lebih dari satu wallet untuk satu user.", dupWallets);

  // Ledger ganda
  const groups = new Map();
  for (const t of tx) {
    const k = `${t.userId}|${t.type}|${t.referenceType}|${t.referenceId}`;
    groups.set(k, [...(groups.get(k) || []), t.$id]);
  }
  const dups = [...groups.entries()].filter(([, ids]) => ids.length > 1).map(([k, ids]) => ({ key: k.split("|").slice(1).join("|"), ids }));
  const byType = {};
  for (const t of tx) byType[`${t.type}/${t.referenceType}/${t.status}`] = (byType[`${t.type}/${t.referenceType}/${t.status}`] || 0) + 1;
  const stuck = tx.filter((t) => ["pending", "processing"].includes(t.status) && t.type !== "withdrawal").map((t) => t.$id);
  report.ledger = { total: tx.length, byTypeRefStatus: byType, duplicates: dups, stuckPendingOrProcessing: stuck };
  if (dups.length) anomaly("ledger-duplicate", "critical", "#3", "Ledger ganda (user, type, referenceType, referenceId sama).", dups.flatMap((d) => d.ids));
  if (stuck.length) anomaly("ledger-stuck", "high", "#3", "Ledger tertahan pending/processing (kredit belum pasti).", stuck);
}

// ── Escrow ──────────────────────────────────────────────────────────────────
{
  const tx = rows("transactions");
  const refundFor = new Set(tx.filter((t) => t.type === "refund" && t.referenceType === "escrow" && t.status === "completed").map((t) => t.referenceId));
  const releaseFor = new Set(tx.filter((t) => t.type === "release" && t.referenceType === "escrow").map((t) => t.referenceId));
  const byStatus = {};
  for (const e of rows("escrows")) byStatus[e.status] = (byStatus[e.status] || 0) + 1;
  const refundedNoCredit = rows("escrows").filter((e) => e.status === "refunded" && !refundFor.has(e.$id)).map((e) => e.$id);
  const bothWays = rows("escrows").filter((e) => refundFor.has(e.$id) && releaseFor.has(e.$id)).map((e) => e.$id);
  const stuckReleasing = rows("escrows").filter((e) => e.status === "releasing").map((e) => e.$id);
  const perOrder = new Map();
  for (const e of rows("escrows")) perOrder.set(e.orderId, (perOrder.get(e.orderId) || 0) + 1);
  report.escrows = {
    byStatus,
    heldTotal: rows("escrows").filter((e) => e.status === "held").reduce((a, e) => a + (e.amount || 0), 0),
    refundedWithoutCredit: refundedNoCredit,
    releasedAndRefunded: bothWays,
    stuckReleasing,
    multiplePerOrder: [...perOrder.entries()].filter(([, n]) => n > 1).map(([o]) => o),
  };
  if (refundedNoCredit.length) anomaly("escrow-refunded-no-credit", "critical", "#3", "Escrow refunded tanpa ledger refund completed (dana hilang).", refundedNoCredit);
  if (bothWays.length) anomaly("escrow-release-and-refund", "critical", "#3", "Escrow punya release DAN refund (bayar dua kali).", bothWays);
  if (stuckReleasing.length) anomaly("escrow-stuck-releasing", "high", "#3", "Escrow tertahan di releasing.", stuckReleasing);
}

// ── Payments & withdrawals ──────────────────────────────────────────────────
{
  const p = rows("payments");
  const byStatus = {};
  for (const x of p) byStatus[`${x.purpose}/${x.status}`] = (byStatus[`${x.purpose}/${x.status}`] || 0) + 1;
  const paidPerKey = new Map();
  for (const x of p.filter((x) => x.status === "paid")) {
    const k = x.order_id ? `order:${x.order_id}` : x.campaign_id ? `campaign:${x.campaign_id}` : `none:${x.$id}`;
    paidPerKey.set(k, [...(paidPerKey.get(k) || []), x.$id]);
  }
  const multiPaidOrders = [...paidPerKey.entries()].filter(([k, ids]) => k.startsWith("order:") && ids.length > 1);
  const paidCampaignNoLedger = p
    .filter((x) => x.status === "paid" && x.purpose === "campaign")
    .filter((x) => !rows("transactions").some((t) => t.type === "payment" && t.referenceType === "payment" && t.referenceId === x.$id))
    .map((x) => x.$id);
  report.payments = {
    byPurposeStatus: byStatus,
    paidTotal: p.filter((x) => x.status === "paid").reduce((a, x) => a + (x.amount || 0), 0),
    multiplePaidPerOrder: multiPaidOrders.map(([k, ids]) => ({ key: k, ids })),
    paidCampaignWithoutLedger: paidCampaignNoLedger,
  };
  if (multiPaidOrders.length) anomaly("payment-multi-paid-order", "high", "#3", "Lebih dari satu payment paid untuk satu order.", multiPaidOrders.flatMap(([, ids]) => ids));
  if (paidCampaignNoLedger.length) anomaly("payment-paid-no-topup", "high", "#3", "Payment campaign paid tanpa ledger top-up (create-escrow tidak jalan).", paidCampaignNoLedger);

  const w = rows("withdrawals");
  const wByStatus = {};
  for (const x of w) wByStatus[x.status] = (wByStatus[x.status] || 0) + 1;
  const ledgerW = new Set(rows("transactions").filter((t) => t.type === "withdrawal").map((t) => t.referenceId));
  const forged = w.filter((x) => !ledgerW.has(x.$id) && x.status !== "failed").map((x) => x.$id);
  report.withdrawals = {
    byStatus: wByStatus,
    openAmount: w.filter((x) => ["requested", "processing"].includes(x.status)).reduce((a, x) => a + (x.amount || 0), 0),
    withoutLedger: forged,
  };
  if (forged.length) anomaly("withdrawal-without-ledger", "high", null, "Withdrawal tanpa ledger debit (dibuat langsung dari browser?).", forged);
}

// ── Output ──────────────────────────────────────────────────────────────────
const order = { critical: 0, high: 1, warn: 2, info: 3 };
report.anomalies.sort((a, b) => order[a.severity] - order[b.severity]);
report.summary = {
  totalRows: Object.values(report.counts).reduce((a, n) => a + n, 0),
  totalFiles: Object.values(report.storage).reduce((a, s) => a + s.files, 0),
  authUsers: authUsers.length,
  anomalies: report.anomalies.reduce((m, a) => ({ ...m, [a.severity]: (m[a.severity] || 0) + 1 }), {}),
  exploitSuspected: report.anomalies.some((a) => a.severity === "critical"),
};
const json = JSON.stringify(report, null, 2);
if (OUT) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json + "\n");
  console.error(`Laporan: ${OUT}`);
}
console.log(JSON.stringify({ summary: report.summary, anomalies: report.anomalies }, null, 2));
