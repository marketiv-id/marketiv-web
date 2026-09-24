/**
 * inspect-campaign.mjs — Inspektor read-only campaign.
 *
 * Cetak semua baris terkait satu campaign: campaigns, campaign_claims,
 * campaign_submissions, payments, transactions. Berguna untuk memverifikasi
 * tiap langkah E2E tanpa membuka Appwrite Console.
 *
 * SIGNATURE:
 *   node appwrite/ops/inspect-campaign.mjs --campaign <id>
 *
 * Mode baku: TIDAK PERNAH menulis apa pun.
 */
import { aw, DB, q } from "./client.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : undefined; };
const campaignId = opt("--campaign");

if (!campaignId) {
  console.error("ERR  --campaign <id> wajib diisi.");
  process.exit(1);
}

const C = (table) => `/tablesdb/${DB}/tables/${table}/rows`;

function fmt(n) {
  return typeof n === "number"
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
    : String(n ?? "-");
}

function printRow(label, row) {
  if (!row) { console.log(`  ${label}: (tidak ada)`); return; }
  const keys = Object.keys(row).filter((k) => !["$collectionId", "$databaseId", "$permissions"].includes(k));
  console.log(`  ${label}:`);
  for (const k of keys) {
    const v = row[k];
    if (v === null || v === undefined || v === "") continue;
    console.log(`    ${k}: ${Array.isArray(v) ? JSON.stringify(v) : v}`);
  }
}

async function fetchAll(table, queries) {
  try {
    const res = await aw(C(table), { queries });
    return res.rows || res.documents || [];
  } catch (err) {
    console.warn(`  WARN Gagal membaca ${table}: ${err.message}`);
    return [];
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n=== INSPECT-CAMPAIGN: ${campaignId} ===\n`);

// 1. Campaign
const campRes = await fetchAll("campaigns", [q.equal("$id", campaignId), q.limit(1)]);
const camp = campRes[0];
if (!camp) {
  console.error(`ERR  Campaign "${campaignId}" tidak ditemukan.`);
  process.exit(1);
}

printRow("campaign", camp);

// 2. Campaign briefs — collection aktif campaign_briefs_v2 (ID Appwrite).
// Collection lama `campaign_briefs` masih ada untuk rollback/migrasi data;
// runtime & inspect mengikuti yang v2.
const BRIEFS_TABLE = process.env.CAMPAIGN_BRIEFS_COLLECTION_ID || "6ab530d00018edb50097";
const briefs = await fetchAll(BRIEFS_TABLE, [q.equal("campaignId", campaignId), q.limit(5)]);
console.log(`\n  campaign_briefs_v2 (${briefs.length} baris):`);
briefs.forEach((b, i) => printRow(`  [${i}]`, b));

// 3. Campaign assets
const assets = await fetchAll("campaign_assets", [q.equal("campaignId", campaignId), q.limit(10)]);
console.log(`\n  campaign_assets (${assets.length} baris):`);
assets.forEach((a, i) => printRow(`  [${i}]`, a));

// 4. Claims
const claims = await fetchAll("campaign_claims", [
  q.equal("campaignId", campaignId),
  q.limit(50),
]);
console.log(`\n  campaign_claims (${claims.length} baris):`);
const claimIds = [];
for (const c of claims) {
  claimIds.push(c.$id);
  console.log(
    `    ${c.$id}  creatorId=${c.creatorId ?? c.creator_id}  status=${c.status}  expiresAt=${c.expiresAt ?? c.expires_at ?? "-"}`
  );
}
console.log(`  totalClaims (DB): ${camp.totalClaims ?? "?"}`);

// 5. Submissions
const subs = await fetchAll("campaign_submissions", [
  q.equal("campaignId", campaignId),
  q.limit(50),
]);
console.log(`\n  campaign_submissions (${subs.length} baris):`);
for (const s of subs) {
  console.log(
    `    ${s.$id}  creatorId=${s.creatorId ?? s.creator_id}  platform=${s.platform}  ` +
    `status=${s.status}  fraudStatus=${s.fraudStatus ?? s.fraud_status ?? "-"}  views=${s.views ?? 0}`
  );
}

// 6. Payments terkait campaign
const pays = await fetchAll("payments", [
  q.equal("reference_id", campaignId),
  q.limit(20),
]);
console.log(`\n  payments (${pays.length} baris):`);
for (const p of pays) {
  console.log(
    `    ${p.$id}  gateway=${p.gateway}  amount=${fmt(p.amount)}  status=${p.status}  purpose=${p.purpose ?? "-"}`
  );
}

// 7. Transactions terkait campaign (referenceId = campaignId)
const txns = await fetchAll("transactions", [
  q.equal("referenceId", campaignId),
  q.limit(20),
]);
console.log(`\n  transactions (${txns.length} baris):`);
for (const t of txns) {
  console.log(
    `    ${t.$id}  type=${t.type}  amount=${fmt(t.amount)}  status=${t.status}`
  );
}

// ── Ringkasan ─────────────────────────────────────────────────────────────────

console.log("\n─── Ringkasan ───");
console.log(`  status          : ${camp.status}`);
console.log(`  totalClaims     : ${camp.totalClaims ?? 0} / ${camp.claimLimit ?? "?"}`);
console.log(`  remainingBudget : ${fmt(camp.remainingBudget ?? 0)}`);
console.log(`  spentAmount     : ${fmt(camp.spentAmount ?? 0)}`);
console.log(`  submissions     : ${subs.length}`);
console.log(`  payments paid   : ${pays.filter((p) => p.status === "paid").length}`);
console.log();
