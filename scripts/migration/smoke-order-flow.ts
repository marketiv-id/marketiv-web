/**
 * Smoke test alur bisnis Fase 7 terhadap app yang sedang jalan + Supabase
 * (port `00_BACKEND/appwrite/ops/smoke-order-flow.mjs`).
 *
 * Memanggil Route Handler SUNGGUHAN (bukan RPC langsung) dengan sesi akun uji,
 * supaya guard, validasi, peta error, dan RPC teruji bersama:
 *
 *   A. Campaign : UMKM buat draft → [stub top-up] → publish → kreator klaim →
 *                 kirim bukti (+ fraud precheck via after()) → [stub 72 jam] →
 *                 admin review approve
 *   B. Rate card: UMKM buka percakapan → offer → kreator accept → order
 *                 pending_payment → [stub bayar] → deliverable v1 → revisi →
 *                 deliverable v2 → admin validasi → UMKM approve (stub Fase 8)
 *   C. Batal    : offer → accept → UMKM batalkan order pending_payment
 *
 * Langkah [stub …] mengubah data uji lewat service role karena pembayaran dan
 * waktu observasi baru ada di Fase 8. Semua data uji dihapus di akhir (juga
 * saat gagal), kecuali `--keep`.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY  (project yang dipakai app)
 *   BASE_URL        app user, mis. http://localhost:3000
 *   ADMIN_BASE_URL  app admin, mis. http://localhost:3001 (opsional; tanpa ini langkah admin dilewati)
 *   SMOKE_UMKM_EMAIL / SMOKE_CREATOR_EMAIL / SMOKE_ADMIN_EMAIL
 *     (default umkm1@ / creator2@ / admin@example.test — akun fixture staging)
 *
 * Pakai:
 *   node smoke-order-flow.ts --confirm-ref <project-ref>   (wajib bila bukan localhost)
 *
 * Sesi dibuat tanpa email: `auth.admin.generateLink({ type: "magiclink" })` +
 * `verifyOtp({ token_hash })`, lalu dikemas jadi cookie `sb-<ref>-auth-token`
 * (format @supabase/ssr). Token tidak pernah dicetak.
 */
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const confirmRef = args[args.indexOf("--confirm-ref") + 1];

const fail = (msg: string): never => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? fail("Env SUPABASE_URL belum diset");
const ANON = process.env.SUPABASE_ANON_KEY ?? fail("Env SUPABASE_ANON_KEY belum diset");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fail("Env SUPABASE_SERVICE_ROLE_KEY belum diset");
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL?.replace(/\/$/, "");
const UMKM_EMAIL = process.env.SMOKE_UMKM_EMAIL ?? "umkm1@example.test";
const CREATOR_EMAIL = process.env.SMOKE_CREATOR_EMAIL ?? "creator2@example.test";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? "admin@example.test";

const host = new URL(SUPABASE_URL).hostname;
const isLocal = host === "127.0.0.1" || host === "localhost";
const projectRef = isLocal ? "127" : host.split(".")[0];
if (!isLocal && confirmRef !== projectRef) {
  fail(`Target ${host}: jalankan dengan --confirm-ref ${projectRef} sebagai konfirmasi.`);
}

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

// ── Sesi ─────────────────────────────────────────────────────────────────────
const CHUNK = 3180;
function cookieHeader(session: Session): string {
  const name = `sb-${projectRef}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  if (value.length <= CHUNK) return `${name}=${value}`;
  const parts: string[] = [];
  for (let i = 0; i * CHUNK < value.length; i += 1) parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`);
  return parts.join("; ");
}

interface Actor {
  id: string;
  email: string;
  cookie: string;
}

async function login(email: string): Promise<Actor> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) fail(`generateLink ${email}: ${error?.message ?? "tanpa token"}`);
  const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data: verified, error: vErr } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties!.hashed_token,
  });
  if (vErr || !verified.session || !verified.user) fail(`verifyOtp ${email}: ${vErr?.message ?? "tanpa sesi"}`);
  return { id: verified.user!.id, email, cookie: cookieHeader(verified.session!) };
}

// ── HTTP ─────────────────────────────────────────────────────────────────────
interface Res {
  status: number;
  body: Record<string, unknown>;
}

async function call(actor: Actor, method: string, path: string, body?: unknown, base = BASE_URL): Promise<Res> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Cookie: actor.cookie, "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    // respons tanpa body
  }
  return { status: res.status, body: json };
}

// ── Laporan ──────────────────────────────────────────────────────────────────
const results: { ok: boolean; name: string; detail: string }[] = [];
function check(name: string, ok: boolean, detail: unknown = ""): boolean {
  const text = typeof detail === "string" ? detail : JSON.stringify(detail);
  results.push({ ok, name, detail: text.slice(0, 200) });
  console.log(`${ok ? "✔" : "✖"} ${name}${ok || !text ? "" : ` — ${text.slice(0, 200)}`}`);
  return ok;
}
function expectStatus(name: string, res: Res, ...statuses: number[]): boolean {
  return check(`${name} (${res.status})`, statuses.includes(res.status), res.body);
}
const str = (v: unknown): string => (typeof v === "string" ? v : "");

// ── Pembersihan ──────────────────────────────────────────────────────────────
const created = { campaigns: [] as string[], conversations: [] as string[] };
const startedAt = new Date().toISOString();
const actorIds: string[] = [];

async function cleanup(): Promise<void> {
  if (keep) {
    console.log("(--keep) data uji tidak dihapus:", created);
    return;
  }
  for (const id of created.campaigns) {
    const { data: subs } = await admin.from("campaign_submissions").select("id").eq("campaign_id", id);
    const subIds = (subs ?? []).map((s) => s.id as string);
    if (subIds.length) await admin.from("fraud_checks").delete().in("submission_id", subIds);
    await admin.from("campaign_submissions").delete().eq("campaign_id", id);
    await admin.from("campaign_claims").delete().eq("campaign_id", id);
    await admin.from("campaign_briefs").delete().eq("campaign_id", id);
    await admin.from("campaign_assets").delete().eq("campaign_id", id);
    await admin.from("campaigns").delete().eq("id", id);
    await admin.from("notifications").delete().like("message", "%SMOKE-F7%");
  }
  for (const id of created.conversations) {
    const { data: offers } = await admin.from("offers").select("id").eq("conversation_id", id);
    const offerIds = (offers ?? []).map((o) => o.id as string);
    if (offerIds.length) {
      const { data: orders } = await admin.from("orders").select("id").in("offer_id", offerIds);
      const orderIds = (orders ?? []).map((o) => o.id as string);
      if (orderIds.length) {
        await admin.from("ratecard_deliverable_validations").delete().in("order_id", orderIds);
        await admin.from("revisions").delete().in("order_id", orderIds);
        await admin.from("deliverables").delete().in("order_id", orderIds);
        await admin.from("orders").delete().in("id", orderIds);
      }
    }
    await admin.from("messages").delete().eq("conversation_id", id);
    await admin.from("conversations").update({ offer_id: null }).eq("id", id);
    if (offerIds.length) await admin.from("offers").delete().in("id", offerIds);
    await admin.from("conversations").delete().eq("id", id);
  }
  await admin.from("notifications").delete().like("message", "%SMOKE-F7%");
  // Notifikasi tanpa judul uji (mis. "Hasil Kerja Masuk") — milik akun uji, sejak skrip mulai.
  if (actorIds.length) {
    await admin.from("notifications").delete().in("user_id", actorIds).gte("created_at", startedAt);
  }
  console.log("Data uji dihapus.");
}

// ── Alur ─────────────────────────────────────────────────────────────────────
async function campaignFlow(umkm: Actor, creator: Actor, adm: Actor | null): Promise<void> {
  console.log("\n— A. Campaign");
  const create = await call(umkm, "POST", "/api/campaigns", {
    title: "SMOKE-F7 Campaign",
    category: "kuliner",
    type: "ugc",
    platforms: ["tiktok"],
    description: "SMOKE-F7 campaign uji otomatis alur klaim dan review.",
    budget: 100000,
    rewardPer1000Views: 5000,
    claimLimit: 2,
    submissionDays: 7,
  });
  if (!expectStatus("UMKM buat draft", create, 201)) return;
  const campaign = create.body.campaign as Record<string, unknown>;
  const campaignId = str(campaign.id) || str(campaign.$id);
  created.campaigns.push(campaignId);

  const early = await call(umkm, "PATCH", `/api/campaigns/${campaignId}/status`, { action: "publish" });
  expectStatus("publish sebelum didanai ditolak", early, 409);

  // [stub Fase 8] top-up: dana masuk penuh.
  await admin.from("campaigns").update({ remaining_budget: 100000 }).eq("id", campaignId);
  const pub = await call(umkm, "PATCH", `/api/campaigns/${campaignId}/status`, { action: "publish" });
  expectStatus("publish setelah top-up (stub)", pub, 200);

  const claim = await call(creator, "POST", `/api/campaigns/${campaignId}/claim`);
  if (!expectStatus("kreator klaim", claim, 201)) return;
  const claimId = str(claim.body.claimId);
  const again = await call(creator, "POST", `/api/campaigns/${campaignId}/claim`);
  expectStatus("klaim ganda ditolak", again, 409);

  const proof = await call(creator, "POST", `/api/campaigns/${campaignId}/submissions`, {
    claimId,
    platform: "tiktok",
    postUrl: "https://www.tiktok.com/@smoke_f7/video/7300000000000000000",
    caption: "SMOKE-F7 bukti tayang",
  });
  if (!expectStatus("kirim bukti", proof, 201)) return;
  const submissionId = str(proof.body.submissionId);

  let fraud: Record<string, unknown> | null = null;
  for (let i = 0; i < 20 && !fraud; i += 1) {
    const { data } = await admin.from("fraud_checks").select("score,result").eq("submission_id", submissionId).maybeSingle();
    fraud = data;
    if (!fraud) await new Promise((r) => setTimeout(r, 1500));
  }
  check("fraud precheck tercatat (after())", !!fraud, fraud ?? "tidak ada baris fraud_checks");

  const umkmReview = await call(umkm, "POST", `/api/submissions/${submissionId}/review`, { status: "approved", views: 1000 });
  expectStatus("review oleh UMKM ditolak (hanya admin)", umkmReview, 403);

  if (!adm || !ADMIN_BASE_URL) {
    console.log("(ADMIN_BASE_URL kosong — review admin dilewati)");
    return;
  }
  const tooEarly = await call(adm, "POST", `/api/admin/submissions/${submissionId}/review`, { status: "approved", views: 1000 }, ADMIN_BASE_URL);
  expectStatus("admin approve sebelum 72 jam ditolak", tooEarly, 409);
  // [stub] lompati periode observasi.
  await admin.from("campaign_submissions").update({ created_at: new Date(Date.now() - 73 * 3600_000).toISOString() }).eq("id", submissionId);
  const review = await call(adm, "POST", `/api/admin/submissions/${submissionId}/review`, { status: "approved", views: 1000 }, ADMIN_BASE_URL);
  expectStatus("admin approve", review, 200);
  const { data: sub } = await admin.from("campaign_submissions").select("status,views,views_final").eq("id", submissionId).single();
  check("submission approved + views final", sub?.status === "approved" && Number(sub?.views) === 1000 && sub?.views_final === true, sub);
}

async function openConversation(umkm: Actor, creator: Actor): Promise<string | null> {
  const conv = await call(umkm, "POST", "/api/conversations", { creatorId: creator.id });
  if (!expectStatus("UMKM buka percakapan", conv, 200, 201)) return null;
  const id = str(conv.body.conversationId);
  if (!created.conversations.includes(id)) created.conversations.push(id);
  return id;
}

async function createAndAccept(umkm: Actor, creator: Actor, conversationId: string, title: string): Promise<string | null> {
  const offer = await call(umkm, "POST", "/api/offers", {
    conversationId,
    creatorId: creator.id,
    title,
    description: "SMOKE-F7 penawaran uji otomatis.",
    price: 150000,
    deadline: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
    revisionLimit: 2,
  });
  if (!expectStatus(`offer "${title}"`, offer, 201)) return null;
  const offerId = str(offer.body.offerId);
  const accept = await call(creator, "POST", `/api/offers/${offerId}/accept`);
  if (!expectStatus("kreator accept → order", accept, 200)) return null;
  const again = await call(creator, "POST", `/api/offers/${offerId}/accept`);
  check("accept ulang idempoten (order sama)", again.status === 200 && again.body.orderId === accept.body.orderId, again.body);
  return str(accept.body.orderId);
}

async function rateCardFlow(umkm: Actor, creator: Actor, adm: Actor | null): Promise<void> {
  console.log("\n— B. Rate card");
  const conversationId = await openConversation(umkm, creator);
  if (!conversationId) return;
  const orderId = await createAndAccept(umkm, creator, conversationId, "SMOKE-F7 Paket");
  if (!orderId) return;
  const { data: order } = await admin.from("orders").select("status").eq("id", orderId).single();
  check("order pending_payment", order?.status === "pending_payment", order);

  const early = await call(creator, "POST", `/api/orders/${orderId}/deliverables`, { source: "external_url", fileUrl: "https://drive.google.com/smoke-f7-v0" });
  expectStatus("deliverable sebelum bayar ditolak", early, 409);

  // [stub Fase 8] pembayaran sukses → escrow → pengerjaan.
  await admin.from("orders").update({ status: "in_progress" }).eq("id", orderId);

  const v1 = await call(creator, "POST", `/api/orders/${orderId}/deliverables`, { source: "external_url", fileUrl: "https://drive.google.com/smoke-f7-v1", notes: "SMOKE-F7 v1" });
  if (!expectStatus("deliverable v1", v1, 201)) return;
  const rev = await call(umkm, "POST", `/api/orders/${orderId}/revisions`, { message: "SMOKE-F7 tolong revisi warna" });
  expectStatus("UMKM minta revisi", rev, 201);
  const v2 = await call(creator, "POST", `/api/orders/${orderId}/deliverables`, { source: "external_url", fileUrl: "https://drive.google.com/smoke-f7-v2", notes: "SMOKE-F7 v2" });
  if (!expectStatus("deliverable v2", v2, 201)) return;
  const v2Id = str(v2.body.id) || str(v2.body.$id);
  check("versi naik ke 2", Number(v2.body.version) === 2, v2.body);

  if (adm && ADMIN_BASE_URL) {
    const val = await call(adm, "POST", `/api/admin/ratecard-deliverables/${v2Id}/review`, { decision: "valid" }, ADMIN_BASE_URL);
    expectStatus("admin validasi deliverable", val, 200);
  }
  const approve = await call(umkm, "POST", `/api/deliverables/${v2Id}/approve`, { orderId });
  expectStatus("UMKM approve (stub Fase 8)", approve, 200);
  const { data: d } = await admin.from("deliverables").select("status").eq("id", v2Id).single();
  check("deliverable approved", d?.status === "approved", d);
}

async function cancelFlow(umkm: Actor, creator: Actor): Promise<void> {
  console.log("\n— C. Batal order");
  const conversationId = created.conversations[0] ?? (await openConversation(umkm, creator));
  if (!conversationId) return;
  // Order sebelumnya harus selesai agar offer baru diizinkan.
  const { data: prev } = await admin.from("offers").select("id").eq("conversation_id", conversationId);
  if (prev?.length) {
    await admin.from("orders").update({ status: "completed" }).in("offer_id", prev.map((o) => o.id as string));
  }
  const orderId = await createAndAccept(umkm, creator, conversationId, "SMOKE-F7 Batal");
  if (!orderId) return;
  const otherCancel = await call(creator, "POST", `/api/orders/${orderId}/cancel`);
  expectStatus("kreator tidak boleh batalkan", otherCancel, 403);
  const cancel = await call(umkm, "POST", `/api/orders/${orderId}/cancel`);
  expectStatus("UMKM batalkan order pending_payment", cancel, 200);
}

async function main(): Promise<void> {
  console.log(`Smoke Fase 7 → app ${BASE_URL}${ADMIN_BASE_URL ? ` + admin ${ADMIN_BASE_URL}` : ""}, Supabase ${host}`);
  const [umkm, creator] = await Promise.all([login(UMKM_EMAIL), login(CREATOR_EMAIL)]);
  const adm = ADMIN_BASE_URL ? await login(ADMIN_EMAIL) : null;
  actorIds.push(umkm.id, creator.id);
  // Prasyarat accept offer: ToS versi berjalan disetujui — lewat route asli.
  for (const actor of [umkm, creator]) {
    const status = await call(actor, "POST", "/api/tos", { action: "status" });
    if (status.body.needsConsent) {
      const accepted = await call(actor, "POST", "/api/tos", { action: "accept", tos_version: status.body.currentVersion });
      expectStatus(`setujui ToS (${actor.email})`, accepted, 200);
    }
  }
  try {
    await campaignFlow(umkm, creator, adm);
    await rateCardFlow(umkm, creator, adm);
    await cancelFlow(umkm, creator);
  } finally {
    await cleanup();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} cek lulus`);
  if (failed.length) process.exit(1);
}

await main();
