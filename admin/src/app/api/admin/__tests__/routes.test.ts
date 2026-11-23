import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

let db: FakeSupabase;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => db }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db }));

const dashboard = await import("../dashboard-summary/route");
const submissions = await import("../submission-queue/route");
const withdrawals = await import("../withdrawal-queue/route");
const ratecard = await import("../ratecard-deliverable-queue/route");

const ADMIN_ID = "33333333-3333-3333-3333-333333333333";
const req = (path: string) => new Request(`http://admin.test${path}`);

function loginAsAdmin() {
  db.setAuthUser({ id: ADMIN_ID, app_metadata: { role: "admin" } });
  db.tables.users = [{ id: ADMIN_ID, role: "admin", status: "active" }];
}

beforeEach(() => {
  db = createFakeSupabase({ campaign_submissions: [], campaigns: [], withdrawals: [] });
  db.setRpc("admin_ratecard_deliverable_queue", () => []);
});

const routes = [
  ["dashboard-summary", () => dashboard.GET(req("/api/admin/dashboard-summary"))],
  ["submission-queue", () => submissions.GET(req("/api/admin/submission-queue"))],
  ["withdrawal-queue", () => withdrawals.GET(req("/api/admin/withdrawal-queue"))],
  ["ratecard-deliverable-queue", () => ratecard.GET(req("/api/admin/ratecard-deliverable-queue"))],
] as const;

describe.each(routes)("GET /api/admin/%s", (_name, call) => {
  it("tanpa sesi → 401 JSON", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized", code: "auth" });
  });

  it("kreator (bukan admin) → 403 tanpa data", async () => {
    db.setAuthUser({ id: "c1", app_metadata: {} });
    db.tables.users = [{ id: "c1", role: "creator", status: "active" }];
    const res = await call();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Akses Admin ditolak.", code: "forbidden" });
  });

  it("admin aktif → 200", async () => {
    loginAsAdmin();
    const res = await call();
    expect(res.status).toBe(200);
  });
});

describe("validasi query", () => {
  beforeEach(loginAsAdmin);

  it("submission-queue meneruskan status/limit", async () => {
    const res = await submissions.GET(req("/api/admin/submission-queue?status=all&limit=50"));
    expect(await res.json()).toEqual({ items: [], total: 0 });
    expect(db.calls.find((c) => c.table === "campaign_submissions")?.filters).toEqual([]);
  });

  it.each([
    ["/api/admin/submission-queue?status=bogus", "Status submission tidak valid."],
    ["/api/admin/submission-queue?limit=abc", "Limit harus antara 1 dan 100."],
    ["/api/admin/withdrawal-queue?offset=1.5", "Offset harus antara 0 dan 10000."],
    ["/api/admin/withdrawal-queue?limit=500", "Limit harus antara 1 dan 100."],
  ])("%s → 400", async (path, message) => {
    const handler = path.includes("submission") ? submissions.GET : withdrawals.GET;
    const res = await handler(req(path));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: message, code: "validation" });
  });

  it("withdrawal-queue mengembalikan limit/offset", async () => {
    const res = await withdrawals.GET(req("/api/admin/withdrawal-queue?status=all&limit=100&offset=0"));
    expect(await res.json()).toEqual({ items: [], total: 0, limit: 100, offset: 0 });
  });

  it("error database → 500 generik tanpa detail", async () => {
    db.failTable("campaigns", { code: "XX000", message: "rahasia internal" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await dashboard.GET(req("/api/admin/dashboard-summary"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Terjadi kesalahan di server. Coba lagi.", code: "server" });
  });
});
