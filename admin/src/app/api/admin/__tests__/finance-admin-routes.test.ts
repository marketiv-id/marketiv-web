import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

let db: FakeSupabase;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => db }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db }));

const withdrawalReview = await import("../withdrawals/[withdrawalId]/review/route");
const suspend = await import("../users/[userId]/suspend/route");
const unsuspend = await import("../users/[userId]/unsuspend/route");
const verifyKyc = await import("../users/[userId]/verify-kyc/route");
const appealReview = await import("../appeals/[appealId]/review/route");

const ADMIN_ID = "33333333-3333-3333-3333-333333333333";
const TARGET = "44444444-4444-4444-4444-444444444444";

function loginAsAdmin() {
  db.setAuthUser({ id: ADMIN_ID, app_metadata: { role: "admin" } });
  db.tables.users = [{ id: ADMIN_ID, role: "admin", status: "active" }];
}
const post = (body?: unknown) =>
  new Request("http://admin.test/api/admin/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });
const rpcError = (code: string, message: string) => {
  throw Object.assign(new Error(message), { code });
};

beforeEach(() => {
  db = createFakeSupabase({ users: [] });
});

describe("POST /api/admin/withdrawals/[withdrawalId]/review", () => {
  const call = (body: unknown, id = "wd-1") => withdrawalReview.POST(post(body), params({ withdrawalId: id }));

  it("401 tanpa sesi, 403 bukan admin; RPC tidak dipanggil", async () => {
    expect((await call({ action: "start_processing" })).status).toBe(401);
    db.setAuthUser({ id: "c1", app_metadata: {} });
    db.tables.users = [{ id: "c1", role: "creator", status: "active" }];
    expect((await call({ action: "start_processing" })).status).toBe(403);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it.each([
    [{ action: "approve" }, "Action withdrawal tidak valid."],
    [{ action: "mark_succeeded" }, "Referensi transfer wajib diisi."],
    [{ action: "fail", failureReason: "  " }, "Alasan kegagalan wajib diisi."],
    ["{rusak", "Format permintaan tidak valid."],
  ])("body %j → 400", async (body, error) => {
    loginAsAdmin();
    const res = await call(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("200: argumen RPC transition_withdrawal dari sesi admin", async () => {
    loginAsAdmin();
    let args: Record<string, unknown> = {};
    db.setRpc("transition_withdrawal", (a) => {
      args = a;
      return { success: true, withdrawalId: "wd-1", status: "reversed" };
    });
    const res = await call({ action: "fail", failureReason: " Rekening salah ", adminNote: "cek" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, withdrawalId: "wd-1", status: "reversed" });
    expect(args).toEqual({
      p_admin_id: ADMIN_ID, p_withdrawal_id: "wd-1", p_action: "fail",
      p_transfer_reference: null, p_failure_reason: "Rekening salah", p_admin_note: "cek",
    });
  });

  it.each([
    ["P0002", "Withdrawal tidak ditemukan.", 404],
    ["P0001", "Transisi succeeded dengan action fail tidak diizinkan.", 409],
    ["42501", "Akses Admin ditolak.", 403],
  ])("error RPC %s → %i", async (code, message, status) => {
    loginAsAdmin();
    db.setRpc("transition_withdrawal", () => rpcError(code, message));
    const res = await call({ action: "start_processing" });
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ error: message });
  });
});

describe("aksi admin terhadap user + banding", () => {
  it("suspend: 400 tanpa alasan / userId bukan UUID; 200 meneruskan RPC", async () => {
    loginAsAdmin();
    expect((await suspend.POST(post({ status: "suspended" }), params({ userId: TARGET }))).status).toBe(400);
    expect((await suspend.POST(post({ reason: "x" }), params({ userId: "bukan-uuid" }))).status).toBe(400);
    expect((await suspend.POST(post({ status: "banned", reason: "x" }), params({ userId: TARGET }))).status).toBe(400);
    let args: Record<string, unknown> = {};
    db.setRpc("admin_suspend_user", (a) => {
      args = a;
      return { status: "suspended", deadlineAt: "t", notificationId: "n" };
    });
    const res = await suspend.POST(post({ reason: " Spam " }), params({ userId: TARGET }));
    expect(res.status).toBe(200);
    expect(args).toEqual({ p_admin_id: ADMIN_ID, p_user_id: TARGET, p_status: "suspended", p_reason: "Spam" });
  });

  it("suspend: 409 sudah nonaktif, 403 target admin", async () => {
    loginAsAdmin();
    db.setRpc("admin_suspend_user", () => rpcError("P0001", "User is already suspended or terminated"));
    expect((await suspend.POST(post({ reason: "x" }), params({ userId: TARGET }))).status).toBe(409);
    db.setRpc("admin_suspend_user", () => rpcError("42501", "Akun Admin tidak dapat ditangguhkan dari sini."));
    expect((await suspend.POST(post({ reason: "x" }), params({ userId: TARGET }))).status).toBe(403);
  });

  it("unsuspend (body opsional) + verify-kyc + 404", async () => {
    loginAsAdmin();
    db.setRpc("admin_unsuspend_user", (a) => ({ status: "active", notificationId: "n", note: a.p_note }));
    const res = await unsuspend.POST(post(), params({ userId: TARGET }));
    expect(res.status).toBe(200);
    db.setRpc("admin_verify_kyc", () => ({ status: "ok", userId: TARGET, kyc_status: "verified", alreadyVerified: false }));
    expect((await verifyKyc.POST(post(), params({ userId: TARGET }))).status).toBe(200);
    db.setRpc("admin_verify_kyc", () => rpcError("P0002", "Profil user tidak ditemukan"));
    expect((await verifyKyc.POST(post(), params({ userId: TARGET }))).status).toBe(404);
  });

  it("appeal review: 400 keputusan salah, 200, 409 sudah diputus; non-admin 403", async () => {
    db.setAuthUser({ id: "c1", app_metadata: {} });
    db.tables.users = [{ id: "c1", role: "creator", status: "active" }];
    expect((await appealReview.POST(post({ decision: "approved" }), params({ appealId: "apl-1" }))).status).toBe(403);
    loginAsAdmin();
    expect((await appealReview.POST(post({ decision: "maybe" }), params({ appealId: "apl-1" }))).status).toBe(400);
    db.setRpc("admin_review_appeal", () => ({ status: "approved", notificationId: "n" }));
    expect((await appealReview.POST(post({ decision: "approved", note: "ok" }), params({ appealId: "apl-1" }))).status).toBe(200);
    db.setRpc("admin_review_appeal", () => rpcError("P0001", "Appeal is already decided"));
    expect((await appealReview.POST(post({ decision: "rejected" }), params({ appealId: "apl-1" }))).status).toBe(409);
  });
});
