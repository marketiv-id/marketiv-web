import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/auth/http-error";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const K = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  db: null as unknown as FakeSupabase,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mocks.db }));
vi.mock("@/server/auth/require-user", () => ({ requireUser: mocks.requireUser }));

import { GET as dashboard } from "../dashboard-summary/route";
import { GET as directory } from "../directory/route";
import { GET as negotiations } from "../negotiations/route";
import { GET as profile } from "../profile/route";

const get = (path: string) => new Request(`http://localhost${path}`);

const session = (role = "creator") => ({
  user: { id: K, user_metadata: { display_name: "Nama Akun" } },
  userRow: { id: K, role, status: "active" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db = createFakeSupabase({
    creator_profiles: [{ id: "cp-k", user_id: K, display_name: "Kreator", rating: 4.5, is_profile_completed: true }],
    creator_social_accounts: [],
  });
  mocks.db.setRpc("creator_starting_prices", () => []);
  mocks.db.setRpc("creator_dashboard_summary", () => ({ balance: 5 }));
  mocks.db.setRpc("creator_negotiation_rows", () => []);
  mocks.db.setRpc("creator_directory_page", () => ({ items: [], total: 0 }));
  mocks.requireUser.mockResolvedValue(session());
});

describe("GET /api/creator/*", () => {
  it.each([
    ["dashboard-summary", dashboard, "/api/creator/dashboard-summary"],
    ["profile", profile, "/api/creator/profile"],
    ["negotiations", negotiations, "/api/creator/negotiations"],
    ["directory", directory, "/api/creator/directory"],
  ] as const)("%s: tanpa sesi → 401 { error, code: auth }", async (_name, handler, path) => {
    mocks.requireUser.mockRejectedValue(new HttpError(401, "Sesi tidak ditemukan. Silakan login."));
    const res = await handler(get(path));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sesi tidak ditemukan. Silakan login.", code: "auth" });
  });

  it.each([
    ["dashboard-summary", dashboard, "/api/creator/dashboard-summary"],
    ["profile", profile, "/api/creator/profile"],
    ["negotiations", negotiations, "/api/creator/negotiations"],
  ] as const)("%s: hanya role creator (role lain → 403 dari guard)", async (_name, handler, path) => {
    mocks.requireUser.mockRejectedValue(new HttpError(403, "Akun ini tidak punya akses untuk aksi tersebut."));
    const res = await handler(get(path));
    expect(res.status).toBe(403);
    expect(mocks.requireUser).toHaveBeenCalledWith({ role: "creator" });
  });

  it("directory: semua role aktif boleh (tanpa filter role)", async () => {
    mocks.requireUser.mockResolvedValue(session("umkm"));
    const res = await directory(get("/api/creator/directory?limit=12"));
    expect(res.status).toBe(200);
    expect(mocks.requireUser).toHaveBeenCalledWith();
    expect(await res.json()).toEqual({ items: [], total: 0, nextCursor: null });
    expect(mocks.db.rpc).toHaveBeenCalledWith("creator_directory_page", { p_limit: 12, p_cursor: null });
  });

  it("directory: limit bukan angka → 400 validation", async () => {
    const res = await directory(get("/api/creator/directory?limit=abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "validation" });
  });

  it("directory: creatorId → satu profil; tidak ada → 404", async () => {
    const ok = await directory(get(`/api/creator/directory?creatorId=${K}`));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ id: K, name: "Kreator", startingPrice: 0 });
    const missing = await directory(get("/api/creator/directory?creatorId=bukan-uuid"));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ code: "not_found" });
  });

  it("negotiations: conversationId terlalu panjang → 400; tidak ditemukan → 404", async () => {
    const bad = await negotiations(get(`/api/creator/negotiations?conversationId=${"x".repeat(300)}`));
    expect(bad.status).toBe(400);
    const missing = await negotiations(get("/api/creator/negotiations?conversationId=conv-lain"));
    expect(missing.status).toBe(404);
    expect(mocks.db.rpc).toHaveBeenCalledWith("creator_negotiation_rows", { p_user_id: K, p_conversation_id: "conv-lain" });
    const list = await negotiations(get("/api/creator/negotiations"));
    expect(await list.json()).toEqual([]);
  });

  it("profile & dashboard: identitas dari sesi, bukan query", async () => {
    const p = await profile(get("/api/creator/profile?userId=orang-lain"));
    expect(await p.json()).toMatchObject({ id: K, name: "Nama Akun" });
    const d = await dashboard(get("/api/creator/dashboard-summary"));
    expect(await d.json()).toMatchObject({ balance: 5, escrowBalance: 0 });
    expect(mocks.db.rpc).toHaveBeenCalledWith("creator_dashboard_summary", { p_user_id: K });
  });

  it("error DB tak terduga → 500 generik tanpa detail", async () => {
    mocks.db.failTable("creator_profiles", { code: "XX000", message: "rahasia internal" });
    const res = await profile(get("/api/creator/profile"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Terjadi kesalahan di server. Coba lagi.", code: "server" });
  });
});
