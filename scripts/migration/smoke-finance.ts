/**
 * Smoke test UANG Fase 8 terhadap app yang sedang jalan + Supabase.
 *
 * Melengkapi `smoke-order-flow.ts` (alur tanpa uang). Di sini pembayaran
 * tidak di-stub: payment dibuat lewat RPC `create_payment`, lalu "dibayar"
 * dengan mengirim notifikasi Midtrans BERTANDA TANGAN ke
 * `POST /api/webhooks/midtrans` — jalur yang sama dengan Midtrans sungguhan.
 * Snap tidak dipanggil, jadi tidak butuh kunci Midtrans asli: app cukup
 * dijalankan dengan `MIDTRANS_SERVER_KEY` = nilai `SMOKE_MIDTRANS_SERVER_KEY`.
 *
 *   A. Campaign : draft → payment → webhook (tanda tangan salah 401, nominal
 *                 salah 409, settlement 200, ulang = no-op) → publish → klaim →
 *                 bukti → admin approve → reward masuk wallet kreator
 *   B. Rate card: offer → accept → payment → webhook → escrow held → deliverable →
 *                 UMKM approve (belum divalidasi: escrow tetap held) → admin
 *                 validasi → escrow cair (amount − fee 2%) → review ulang no-op
 *   C. Withdrawal: ajukan → ajukan ulang (requestKey sama) idempoten →
 *                 admin `fail` → saldo dikembalikan
 *   D. Rekonsiliasi: selisih `finance_reconciliation` akun uji tidak berubah.
 *
 * Semua data uji dihapus dan saldo wallet akun uji dikembalikan ke nilai awal.
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, BASE_URL,
 * ADMIN_BASE_URL, SMOKE_MIDTRANS_SERVER_KEY (+ SMOKE_*_EMAIL opsional).
 * Pakai: node smoke-finance.ts --confirm-ref <project-ref>
 */
import { createHash, randomUUID } from "node:crypto";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const confirmRef = args[args.indexOf("--confirm-ref") + 1];
const fail = (msg: string): never => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? fail("Env SUPABASE_URL belum diset");
const ANON = process.env.SUPABASE_ANON_KEY ?? fail("Env SUPABASE_ANON_KEY belum diset");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fail("Env SUPABASE_SERVICE_ROLE_KEY belum diset");
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ADMIN_BASE_URL = (process.env.ADMIN_BASE_URL ?? fail("Env ADMIN_BASE_URL belum diset")).replace(/\/$/, "");
const MIDTRANS_KEY = process.env.SMOKE_MIDTRANS_SERVER_KEY ?? fail("Env SMOKE_MIDTRANS_SERVER_KEY belum diset");
const UMKM_EMAIL = process.env.SMOKE_UMKM_EMAIL ?? "umkm1@example.test";
const CREATOR_EMAIL = process.env.SMOKE_CREATOR_EMAIL ?? "creator2@example.test";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? "admin@example.test";

const host = new URL(SUPABASE_URL).hostname;
const isLocal = host === "127.0.0.1" || host === "localhost";
const projectRef = isLocal ? "127" : host.split(".")[0];
if (!isLocal && confirmRef !== projectRef) fail(`Target ${host}: jalankan dengan --confirm-ref ${projectRef}.`);

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

// ── Sesi & HTTP (sama dengan smoke-order-flow.ts) ───────────────────────────
const CHUNK = 3180;
function cookieHeader(session: Session): string {
  const name = `sb-${projectRef}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  if (value.length <= CHUNK) return `${name}=${value}`;
  const parts: string[] = [];
  for (let i = 0; i * CHUNK < value.length; i += 1) parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`);
  return parts.join("; ");
}
interface Actor { id: string; email: string; cookie: string }
async function login(email: string): Promise<Actor> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) fail(`generateLink ${email}: ${error?.message ?? "tanpa token"}`);
  const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data: v, error: vErr } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: data.properties!.hashed_token });
  if (vErr || !v.session || !v.user) fail(`verifyOtp ${email}: ${vErr?.message ?? "tanpa sesi"}`);
  return { id: v.user!.id, email, cookie: cookieHeader(v.session!) };
}
interface Res { status: number; body: Record<string, unknown> }
async function call(actor: Actor | null, method: string, path: string, body?: unknown, base = BASE_URL): Promise<Res> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...(actor ? { Cookie: actor.cookie } : {}), "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  let json: Record<string, unknown> = {};
  try { json = (await res.json()) as Record<string, unknown>; } catch { /* tanpa body */ }
  return { status: res.status, body: json };
}

const results: { ok: boolean; name: string }[] = [];
function check(name: string, ok: boolean, detail: unknown = ""): boolean {
  const text = typeof detail === "string" ? detail : JSON.stringify(detail);
  results.push({ ok, name });
  console.log(`${ok ? "✔" : "✖"} ${name}${ok || !text ? "" : ` — ${text.slice(0, 220)}`}`);
  return ok;
}
const expectStatus = (name: string, res: Res, ...s: number[]) => check(`${name} (${res.status})`, s.includes(res.status), res.body);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(name, params);
  if (error) fail(`rpc ${name}: ${error.code} ${error.message}`);
  return data as T;
}
async function balance(userId: string): Promise<number> {
  const { data } = await admin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
  return Number(data?.balance ?? 0);
}
async function reconDiff(userId: string): Promise<number> {
  const { data } = await admin.from("finance_reconciliation").select("diff").eq("user_id", userId).maybeSingle();
  return Number(data?.diff ?? 0);
}

// ── Webhook Midtrans bertanda tangan ─────────────────────────────────────────
async function webhook(orderId: string, gross: number, status = "settlement", opts: { badSignature?: boolean } = {}): Promise<Res> {
  const grossText = `${gross}.00`;
  const statusCode = "200";
  const signature = opts.badSignature
    ? "0".repeat(128)
    : createHash("sha512").update(`${orderId}${statusCode}${grossText}${MIDTRANS_KEY}`).digest("hex");
  return call(null, "POST", "/api/webhooks/midtrans", {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossText,
    signature_key: signature,
    transaction_status: status,
    fraud_status: "accept",
    transaction_id: randomUUID(),
    payment_type: "bank_transfer",
  });
}

// ── Pembersihan ──────────────────────────────────────────────────────────────
const created = {
  campaigns: [] as string[],
  conversations: [] as string[],
  payments: [] as string[],
  withdrawals: [] as string[],
  ledgerRefs: [] as string[],
};
const startedAt = new Date().toISOString();
const walletStart = new Map<string, number>();

async function cleanup(actorIds: string[]): Promise<void> {
  const del = (t: string) => admin.from(t).delete();
  if (created.payments.length) {
    await del("payment_events").in("payment_id", created.payments);
    const { data: pays } = await admin.from("payments").select("gateway_reference").in("id", created.payments);
    const refs = (pays ?? []).map((p) => p.gateway_reference as string);
    if (refs.length) await del("payment_events").in("gateway_reference", refs);
  }
  const orderIds: string[] = [];
  for (const conv of created.conversations) {
    const { data: offers } = await admin.from("offers").select("id").eq("conversation_id", conv);
    const offerIds = (offers ?? []).map((o) => o.id as string);
    if (offerIds.length) {
      const { data: orders } = await admin.from("orders").select("id").in("offer_id", offerIds);
      orderIds.push(...(orders ?? []).map((o) => o.id as string));
    }
  }
  if (orderIds.length) {
    const { data: escrows } = await admin.from("escrows").select("id").in("order_id", orderIds);
    created.ledgerRefs.push(...orderIds, ...(escrows ?? []).map((e) => e.id as string));
  }
  const { data: subs } = created.campaigns.length
    ? await admin.from("campaign_submissions").select("id").in("campaign_id", created.campaigns)
    : { data: [] };
  const subIds = (subs ?? []).map((s) => s.id as string);
  created.ledgerRefs.push(...subIds, ...created.payments, ...created.withdrawals, ...created.campaigns);
  if (created.ledgerRefs.length) await del("transactions").in("reference_id", created.ledgerRefs);
  if (created.withdrawals.length) await del("withdrawals").in("id", created.withdrawals);
  if (created.payments.length) await del("payments").in("id", created.payments);
  if (orderIds.length) {
    await del("escrows").in("order_id", orderIds);
    await del("ratecard_deliverable_validations").in("order_id", orderIds);
    await del("revisions").in("order_id", orderIds);
    await del("deliverables").in("order_id", orderIds);
    await del("orders").in("id", orderIds);
  }
  for (const conv of created.conversations) {
    await del("messages").eq("conversation_id", conv);
    await admin.from("conversations").update({ offer_id: null }).eq("id", conv);
    await del("offers").eq("conversation_id", conv);
    await del("conversations").eq("id", conv);
  }
  for (const id of created.campaigns) {
    if (subIds.length) await del("fraud_checks").in("submission_id", subIds);
    await del("campaign_submissions").eq("campaign_id", id);
    await del("campaign_claims").eq("campaign_id", id);
    await del("campaign_briefs").eq("campaign_id", id);
    await del("campaign_assets").eq("campaign_id", id);
    await del("campaigns").eq("id", id);
  }
  await del("admin_actions").gte("created_at", startedAt).in("target_id", [...created.withdrawals, ...orderIds]);
  await del("notifications").like("message", "%SMOKE-F8%");
  if (actorIds.length) await del("notifications").in("user_id", actorIds).gte("created_at", startedAt);
  // Alert admin dari uji "nominal salah" (record_payment_event → semua admin aktif).
  await del("notifications").eq("title", "Nominal notifikasi Midtrans tidak cocok").gte("created_at", startedAt);
  for (const [userId, value] of walletStart) await admin.from("wallets").update({ balance: value }).eq("user_id", userId);
  console.log("Data uji dihapus, saldo wallet akun uji dikembalikan.");
}

// ── Alur ─────────────────────────────────────────────────────────────────────
async function campaignMoney(umkm: Actor, creator: Actor, adm: Actor): Promise<void> {
  console.log("\n— A. Campaign (top-up → reward)");
  const create = await call(umkm, "POST", "/api/campaigns", {
    title: "SMOKE-F8 Campaign", category: "kuliner", type: "ugc", platforms: ["tiktok"],
    description: "SMOKE-F8 campaign uji alur uang top-up dan reward.", budget: 100000,
    rewardPer1000Views: 5000, claimLimit: 2, submissionDays: 7,
  });
  if (!expectStatus("UMKM buat draft", create, 201)) return;
  const campaign = create.body.campaign as Record<string, unknown>;
  const campaignId = str(campaign.id) || str(campaign.$id);
  created.campaigns.push(campaignId);

  const pay = await rpc<Record<string, unknown>>("create_payment", {
    p_user_id: umkm.id, p_purpose: "campaign", p_amount: 100000, p_campaign_id: campaignId, p_fee_rate: 0.02,
  });
  created.payments.push(str(pay.paymentId));
  const ref = str(pay.gatewayReference);
  const total = Number(pay.totalAmount);
  check("payment campaign pending (total = budget + fee 2%)", total === 102000, pay);

  expectStatus("webhook tanda tangan salah ditolak", await webhook(ref, total, "settlement", { badSignature: true }), 401);
  expectStatus("webhook nominal salah ditolak", await webhook(ref, total - 1), 409);
  expectStatus("webhook settlement", await webhook(ref, total), 200);
  expectStatus("webhook settlement ulang (idempoten)", await webhook(ref, total), 200);
  const { data: c1 } = await admin.from("campaigns").select("remaining_budget").eq("id", campaignId).single();
  check("remaining_budget bertambah SEKALI", Number(c1?.remaining_budget) === 100000, c1);

  expectStatus("publish", await call(umkm, "PATCH", `/api/campaigns/${campaignId}/status`, { action: "publish" }), 200);
  const claim = await call(creator, "POST", `/api/campaigns/${campaignId}/claim`);
  if (!expectStatus("klaim", claim, 201)) return;
  const proof = await call(creator, "POST", `/api/campaigns/${campaignId}/submissions`, {
    claimId: str(claim.body.claimId), platform: "tiktok",
    postUrl: "https://www.tiktok.com/@smoke_f8/video/7300000000000000001", caption: "SMOKE-F8",
  });
  if (!expectStatus("bukti", proof, 201)) return;
  const submissionId = str(proof.body.submissionId);
  await admin.from("campaign_submissions").update({ created_at: new Date(Date.now() - 73 * 3600_000).toISOString() }).eq("id", submissionId);

  const before = await balance(creator.id);
  const review = await call(adm, "POST", `/api/admin/submissions/${submissionId}/review`, { status: "approved", views: 1000 }, ADMIN_BASE_URL);
  expectStatus("admin approve", review, 200);
  check("reward 1000 views × 5000/1000 = 5000 masuk wallet kreator", (await balance(creator.id)) - before === 5000);
  const { data: c2 } = await admin.from("campaigns").select("remaining_budget,spent_amount").eq("id", campaignId).single();
  check("budget berkurang 5000, spent 5000", Number(c2?.remaining_budget) === 95000 && Number(c2?.spent_amount) === 5000, c2);
}

async function rateCardMoney(umkm: Actor, creator: Actor, adm: Actor): Promise<void> {
  console.log("\n— B. Rate card (escrow → release)");
  const conv = await call(umkm, "POST", "/api/conversations", { creatorId: creator.id });
  if (!expectStatus("percakapan", conv, 200, 201)) return;
  const conversationId = str(conv.body.conversationId);
  created.conversations.push(conversationId);
  const offer = await call(umkm, "POST", "/api/offers", {
    conversationId, creatorId: creator.id, title: "SMOKE-F8 Paket", description: "SMOKE-F8",
    price: 150000, deadline: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10), revisionLimit: 1,
  });
  if (!expectStatus("offer", offer, 201)) return;
  const accept = await call(creator, "POST", `/api/offers/${str(offer.body.offerId)}/accept`);
  if (!expectStatus("accept → order", accept, 200)) return;
  const orderId = str(accept.body.orderId);

  const pay = await rpc<Record<string, unknown>>("create_payment", {
    p_user_id: umkm.id, p_purpose: "order", p_amount: 150000, p_order_id: orderId, p_fee_rate: 0.02,
  });
  created.payments.push(str(pay.paymentId));
  expectStatus("webhook settlement order", await webhook(str(pay.gatewayReference), Number(pay.totalAmount)), 200);
  const { data: esc } = await admin.from("escrows").select("id,amount,status").eq("order_id", orderId).maybeSingle();
  const { data: ord } = await admin.from("orders").select("status").eq("id", orderId).single();
  check("escrow held 150000 + order in_progress", esc?.status === "held" && Number(esc?.amount) === 150000 && ord?.status === "in_progress", { esc, ord });

  const dlv = await call(creator, "POST", `/api/orders/${orderId}/deliverables`, { source: "external_url", fileUrl: "https://drive.google.com/smoke-f8", notes: "SMOKE-F8" });
  if (!expectStatus("deliverable", dlv, 201)) return;
  const deliverableId = str(dlv.body.id) || str(dlv.body.$id);
  const before = await balance(creator.id);
  const approve = await call(umkm, "POST", `/api/deliverables/${deliverableId}/approve`, { orderId });
  expectStatus("UMKM approve sebelum validasi admin", approve, 200);
  const { data: esc2 } = await admin.from("escrows").select("status").eq("order_id", orderId).single();
  check("escrow tetap held (validasi admin belum ada)", esc2?.status === "held", esc2);

  const val = await call(adm, "POST", `/api/admin/ratecard-deliverables/${deliverableId}/review`, { decision: "valid" }, ADMIN_BASE_URL);
  expectStatus("admin validasi → escrow cair", val, 200);
  check("kreator menerima 150000 − fee 2% = 147000", (await balance(creator.id)) - before === 147000);
  const { data: esc3 } = await admin.from("escrows").select("status").eq("order_id", orderId).single();
  const { data: ord3 } = await admin.from("orders").select("status").eq("id", orderId).single();
  check("escrow released + order completed", esc3?.status === "released" && ord3?.status === "completed", { esc3, ord3 });
  await call(adm, "POST", `/api/admin/ratecard-deliverables/${deliverableId}/review`, { decision: "valid" }, ADMIN_BASE_URL);
  check("review ulang tidak mengkredit dua kali", (await balance(creator.id)) - before === 147000);
}

async function withdrawalMoney(creator: Actor, adm: Actor): Promise<void> {
  console.log("\n— C. Withdrawal (ajukan → gagal → saldo kembali)");
  const before = await balance(creator.id);
  const body = {
    amount: 50000, payoutMethod: "bank", providerName: "BCA", accountNumber: "1234567890",
    accountName: "SMOKE F8", requestKey: `smoke-f8-${randomUUID()}`,
  };
  const req = await call(creator, "POST", "/api/withdrawals", body);
  if (!expectStatus("ajukan penarikan", req, 200, 201)) return;
  const withdrawalId = str(req.body.withdrawalId);
  created.withdrawals.push(withdrawalId);
  check("saldo berkurang 50000", before - (await balance(creator.id)) === 50000);
  const again = await call(creator, "POST", "/api/withdrawals", body);
  check("ajukan ulang (requestKey sama) idempoten", [200, 201].includes(again.status) && (await balance(creator.id)) === before - 50000, again.body);
  const failRes = await call(adm, "POST", `/api/admin/withdrawals/${withdrawalId}/review`, { action: "fail", failureReason: "SMOKE-F8 uji gagal" }, ADMIN_BASE_URL);
  expectStatus("admin fail → reversal", failRes, 200);
  check("saldo kembali utuh", (await balance(creator.id)) === before);
  const failAgain = await call(adm, "POST", `/api/admin/withdrawals/${withdrawalId}/review`, { action: "fail", failureReason: "x" }, ADMIN_BASE_URL);
  expectStatus("fail kedua ditolak (tidak kredit dua kali)", failAgain, 409);
  const { data: audit } = await admin.from("admin_actions").select("action").eq("target_id", withdrawalId);
  check("aksi admin tercatat di admin_actions", (audit ?? []).some((a) => a.action === "withdrawal_fail"), audit);
}

async function main(): Promise<void> {
  console.log(`Smoke uang Fase 8 → app ${BASE_URL} + admin ${ADMIN_BASE_URL}, Supabase ${host}`);
  const [umkm, creator, adm] = await Promise.all([login(UMKM_EMAIL), login(CREATOR_EMAIL), login(ADMIN_EMAIL)]);
  const actorIds = [umkm.id, creator.id];
  const diffStart = new Map<string, number>();
  for (const id of actorIds) {
    walletStart.set(id, await balance(id));
    diffStart.set(id, await reconDiff(id));
  }
  for (const actor of [umkm, creator]) {
    const s = await call(actor, "POST", "/api/tos", { action: "status" });
    if (s.body.needsConsent) await call(actor, "POST", "/api/tos", { action: "accept", tos_version: s.body.currentVersion });
  }
  try {
    await campaignMoney(umkm, creator, adm);
    await rateCardMoney(umkm, creator, adm);
    await withdrawalMoney(creator, adm);
    console.log("\n— D. Rekonsiliasi");
    for (const id of actorIds) {
      check(`selisih rekonsiliasi tidak berubah (${id === umkm.id ? "UMKM" : "kreator"})`, (await reconDiff(id)) === diffStart.get(id));
    }
  } finally {
    await cleanup(actorIds);
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} cek lulus`);
  if (failed.length) process.exit(1);
}

await main();
