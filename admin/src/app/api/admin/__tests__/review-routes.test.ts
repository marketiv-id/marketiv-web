import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

let db: FakeSupabase;
const createSignedUrl = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => db }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db }));

const submissionReview = await import("../submissions/[submissionId]/review/route");
const deliverableReview = await import("../ratecard-deliverables/[deliverableId]/review/route");
const fileUrl = await import("../files/[fileId]/url/route");

const ADMIN_ID = "33333333-3333-3333-3333-333333333333";

function loginAsAdmin() {
  db.setAuthUser({ id: ADMIN_ID, app_metadata: { role: "admin" } });
  db.tables.users = [{ id: ADMIN_ID, role: "admin", status: "active" }];
}

function post(path: string, body: unknown) {
  return new Request(`http://admin.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

beforeEach(() => {
  db = createFakeSupabase({ users: [], user_files: [] });
  (db as unknown as { storage: unknown }).storage = { from: vi.fn(() => ({ createSignedUrl })) };
  createSignedUrl.mockReset();
});

describe("POST /api/admin/submissions/[submissionId]/review", () => {
  const call = (body: unknown, id = "sub-1") =>
    submissionReview.POST(post(`/api/admin/submissions/${id}/review`, body), params({ submissionId: id }));

  it("tanpa sesi → 401; bukan admin → 403; RPC tidak dipanggil", async () => {
    expect((await call({ status: "rejected" })).status).toBe(401);
    db.setAuthUser({ id: "c1", app_metadata: {} });
    db.tables.users = [{ id: "c1", role: "creator", status: "active" }];
    expect((await call({ status: "rejected" })).status).toBe(403);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: "pending" }, "Status review tidak valid."],
    [{ status: "approved" }, "Jumlah views tidak valid."],
    [{ status: "approved", views: -1 }, "Jumlah views tidak valid."],
    [{ status: "approved", views: 1.5 }, "Jumlah views tidak valid."],
    ["{rusak", "Format permintaan tidak valid."],
  ])("body %j → 400", async (body, error) => {
    loginAsAdmin();
    const res = await call(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("approve → RPC review_submission sebagai admin, respons kontrak lama", async () => {
    loginAsAdmin();
    db.setRpc("review_submission", () => ({ campaignId: "camp-1", status: "approved" }));
    const res = await call({ status: "approved", views: 12000, notes: "  ok  " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, campaignId: "camp-1", status: "approved" });
    expect(db.rpc).toHaveBeenCalledWith("review_submission", {
      p_reviewer_id: ADMIN_ID,
      p_submission_id: "sub-1",
      p_decision: "approved",
      p_note: "ok",
      p_as_admin: true,
      p_views: 12000,
    });
  });

  it("reject → p_views null", async () => {
    loginAsAdmin();
    db.setRpc("review_submission", () => ({ campaign_id: "camp-2" }));
    const res = await call({ status: "rejected", notes: "Tidak sesuai" });
    expect(await res.json()).toEqual({ success: true, campaignId: "camp-2", status: "rejected" });
    expect(db.rpc.mock.calls[0][1]).toMatchObject({ p_decision: "rejected", p_views: null, p_note: "Tidak sesuai" });
  });

  it.each([
    ["P0002", "Submission tidak ditemukan.", 404],
    ["P0001", "Submission ini sudah pernah direview.", 409],
    ["42501", "Akses ditolak.", 403],
    ["22023", "Input tidak valid.", 400],
  ])("error RPC %s → %i dengan pesan RPC", async (code, message, status) => {
    loginAsAdmin();
    db.setRpc("review_submission", () => {
      throw Object.assign(new Error(message), { code });
    });
    const res = await call({ status: "rejected" });
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ error: message });
  });

  it("error DB tak dikenal → 500 generik", async () => {
    loginAsAdmin();
    db.setRpc("review_submission", () => {
      throw Object.assign(new Error("boom"), { code: "XX000" });
    });
    const res = await call({ status: "rejected" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Terjadi kesalahan di server. Coba lagi.", code: "server" });
  });
});

describe("POST /api/admin/ratecard-deliverables/[deliverableId]/review", () => {
  const call = (body: unknown, id = "dlv-1") =>
    deliverableReview.POST(post(`/api/admin/ratecard-deliverables/${id}/review`, body), params({ deliverableId: id }));

  it("tanpa sesi → 401", async () => {
    expect((await call({ decision: "valid" })).status).toBe(401);
  });

  it.each([
    [{ decision: "maybe" }, "Input review tidak valid."],
    [{ decision: "invalid", notes: "   " }, "Catatan wajib untuk keputusan invalid."],
  ])("body %j → 400", async (body, error) => {
    loginAsAdmin();
    const res = await call(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error });
  });

  it("valid → RPC review_ratecard_deliverable", async () => {
    loginAsAdmin();
    db.setRpc("review_ratecard_deliverable", () => ({ success: true, decision: "valid", reviewedAt: "2026-11-23T10:00:00+00:00" }));
    const res = await call({ decision: "valid" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, deliverableId: "dlv-1", decision: "valid", reviewedAt: "2026-11-23T10:00:00+00:00" });
    expect(db.rpc).toHaveBeenCalledWith("review_ratecard_deliverable", {
      p_admin_id: ADMIN_ID,
      p_deliverable_id: "dlv-1",
      p_decision: "valid",
      p_notes: null,
    });
  });

  it.each([
    ["P0001", "Deliverable sudah memiliki keputusan final.", 409],
    ["P0002", "Deliverable atau order tidak ditemukan.", 404],
  ])("error RPC %s → %i", async (code, message, status) => {
    loginAsAdmin();
    db.setRpc("review_ratecard_deliverable", () => {
      throw Object.assign(new Error(message), { code });
    });
    const res = await call({ decision: "invalid", notes: "Buram" });
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ error: message });
  });
});

describe("GET /api/admin/files/[fileId]/url", () => {
  const call = (query = "", id = "file-1") =>
    fileUrl.GET(new Request(`http://admin.test/api/admin/files/${id}/url${query}`), params({ fileId: id }));

  it("tanpa sesi → 401; bukan admin → 403", async () => {
    expect((await call()).status).toBe(401);
    db.setAuthUser({ id: "u1", app_metadata: {} });
    db.tables.users = [{ id: "u1", role: "umkm", status: "active" }];
    expect((await call()).status).toBe(403);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("file tidak ada / terhapus → 404", async () => {
    loginAsAdmin();
    db.tables.user_files = [{ id: "file-1", bucket_id: "user-files", storage_file_id: "u/a.pdf", file_name: "a.pdf", mime_type: "application/pdf", status: "deleted" }];
    expect((await call()).status).toBe(404);
    expect((await call("", "nope")).status).toBe(404);
  });

  it("admin → signed URL JSON, atau 302 dengan ?redirect=1", async () => {
    loginAsAdmin();
    db.tables.user_files = [{ id: "file-1", bucket_id: "user-files", storage_file_id: "u/a.pdf", file_name: "a.pdf", mime_type: "application/pdf", status: "active" }];
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://sb.test/sign/a.pdf?token=t" }, error: null });
    const res = await call();
    expect(await res.json()).toEqual({ url: "https://sb.test/sign/a.pdf?token=t", expiresIn: 300, fileName: "a.pdf", mimeType: "application/pdf" });
    expect(createSignedUrl).toHaveBeenCalledWith("u/a.pdf", 300);
    const redirect = await call("?redirect=1");
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe("https://sb.test/sign/a.pdf?token=t");
    expect(redirect.headers.get("cache-control")).toBe("no-store");
  });

  it("objek hilang di Storage → 404", async () => {
    loginAsAdmin();
    db.tables.user_files = [{ id: "file-1", bucket_id: "user-files", storage_file_id: "u/a.pdf", file_name: "a.pdf", mime_type: "application/pdf", status: "active" }];
    createSignedUrl.mockResolvedValue({ data: null, error: { message: "Object not found", statusCode: "404" } });
    expect((await call()).status).toBe(404);
  });
});
