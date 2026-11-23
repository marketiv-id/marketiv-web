import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/http";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  db: null as unknown as FakeSupabase,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mocks.db,
}));
vi.mock("@/server/auth/require-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/require-user")>()),
  requireUser: mocks.requireUser,
}));

import { GET as dashboard } from "../dashboard-summary/route";
import { GET as finance } from "../finance-summary/route";
import { GET as negotiations } from "../negotiations/route";
import { GET as profile } from "../profile/route";
import { GET as reviews } from "../ratecard-reviews/route";

const UMKM = "11111111-1111-4111-8111-111111111111";
const get = (path: string) => new Request(`http://localhost${path}`);

const routes = [
  ["dashboard-summary", dashboard],
  ["finance-summary", finance],
  ["profile", profile],
  ["negotiations", negotiations],
  ["ratecard-reviews", reviews],
] as const;

function signedIn() {
  mocks.requireUser.mockResolvedValue({
    user: { id: UMKM, email: "auth@example.test", phone: "", user_metadata: { full_name: "Rina" }, app_metadata: {} },
    userRow: { id: UMKM, role: "umkm", status: "active", email: "rina@example.test", phone: "0812" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db = createFakeSupabase({
    umkm_profiles: [{ id: "p1", user_id: UMKM, business_name: "Kopi", city: "Bdg", logo_url: null, is_profile_completed: false }],
  });
  mocks.db.setRpc("umkm_dashboard_summary", () => ({ activeCampaigns: 0 }));
  mocks.db.setRpc("umkm_finance_summary", () => ({ finance: {}, escrow: {} }));
  mocks.db.setRpc("umkm_negotiation_context", () => ({
    conversations: [], unread: [], offers: [], creators: [], orders: [], packages: [], escrows: [], deliverables: [], validations: [],
  }));
  mocks.db.setRpc("umkm_ratecard_review_context", () => ({
    orders: [], offers: [], creators: [], packages: [], escrows: [], deliverables: [], revisions: [], validations: [],
  }));
});

describe("GET /api/umkm/*", () => {
  it.each(routes)("%s: tanpa sesi → 401 tanpa menyentuh database", async (_name, handler) => {
    mocks.requireUser.mockRejectedValue(new HttpError(401, "Sesi tidak ditemukan. Silakan login."));
    const res = await handler(get("/api/umkm/x"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sesi tidak ditemukan. Silakan login.", code: "auth" });
    expect(mocks.db.rpc).not.toHaveBeenCalled();
    expect(mocks.db.calls).toEqual([]);
  });

  it.each(routes)("%s: meminta role umkm (role salah → 403)", async (_name, handler) => {
    mocks.requireUser.mockRejectedValue(new HttpError(403, "Akun ini tidak punya akses untuk aksi tersebut."));
    const res = await handler(get("/api/umkm/x"));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "forbidden" });
    expect(mocks.requireUser).toHaveBeenCalledWith({ role: "umkm" });
  });

  it("dashboard-summary: 200 + userId sesi ke RPC", async () => {
    signedIn();
    const res = await dashboard(get("/api/umkm/dashboard-summary"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ activeCampaigns: 0 });
    expect(mocks.db.rpc).toHaveBeenCalledWith("umkm_dashboard_summary", { p_umkm_id: UMKM });
  });

  it("finance-summary: 200", async () => {
    signedIn();
    const res = await finance(get("/api/umkm/finance-summary"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ finance: {}, escrow: {} });
  });

  it("profile: 200 dengan DTO UmkmProfile", async () => {
    signedIn();
    const res = await profile(get("/api/umkm/profile"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: UMKM, businessName: "Kopi", ownerName: "Rina", email: "rina@example.test",
      whatsappNumber: "0812", location: "Bdg", avatarUrl: "", isVerified: false,
    });
  });

  it("negotiations: daftar kosong → [], conversationId asing → 404", async () => {
    signedIn();
    const list = await negotiations(get("/api/umkm/negotiations"));
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual([]);

    const one = await negotiations(get("/api/umkm/negotiations?conversationId=conv-x"));
    expect(one.status).toBe(404);
    expect(await one.json()).toEqual({ error: "Negotiation not found", code: "not_found" });
    expect(mocks.db.rpc).toHaveBeenLastCalledWith("umkm_negotiation_context", { p_umkm_id: UMKM, p_conversation_id: "conv-x" });
  });

  it("ratecard-reviews: orderId salah → 400, tidak ada → 404", async () => {
    signedIn();
    const bad = await reviews(get("/api/umkm/ratecard-reviews?orderId=a%20b"));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "Order ID tidak valid.", code: "validation" });

    const missing = await reviews(get("/api/umkm/ratecard-reviews?orderId=ord-x"));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Review pekerjaan tidak ditemukan.", code: "not_found" });
  });

  it("error database tak dikenal → 500 generik", async () => {
    signedIn();
    mocks.db.setRpc("umkm_dashboard_summary", () => {
      throw Object.assign(new Error("connection lost"), { code: "08006" });
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await dashboard(get("/api/umkm/dashboard-summary"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Terjadi kesalahan di server. Coba lagi.", code: "server" });
    spy.mockRestore();
  });
});
