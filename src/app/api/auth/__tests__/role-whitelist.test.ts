import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  rpc: vi.fn(),
  requireAuthUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signUp: mocks.signUp } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/server/auth/require-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/require-user")>()),
  requireAuthUser: mocks.requireAuthUser,
}));

import { POST as provision } from "../provision/route";
import { POST as register } from "../register/route";

const json = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const authUser = (meta: Record<string, unknown> = {}) => ({
  id: "u-1",
  email: "user@example.test",
  app_metadata: { provider: "email" },
  user_metadata: meta,
  identities: [{ provider: "email" }],
});

describe("POST /api/auth/register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects admin (and any non-whitelisted role) before touching Supabase", async () => {
    const res = await register(json({ role: "admin", email: "a@example.test", password: "rahasia-aman" }));
    expect(res.status).toBe(400);
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("signs up and provisions with the whitelisted role", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: authUser(), session: {} }, error: null });
    mocks.rpc.mockResolvedValue({ data: { id: "u-1", role: "umkm" }, error: null });

    const res = await register(
      json({ role: "umkm", email: "owner@usaha.id", phone: "08123456789", password: "rahasia-aman" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ userId: "u-1", profileProvisioned: true });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "provision_user",
      expect.objectContaining({ p_user_id: "u-1", p_role: "umkm", p_phone: "08123456789", p_email_verified: false }),
    );
  });

  it("keeps the account when provisioning fails (profileProvisioned:false)", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: authUser(), session: {} }, error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "boom" } });

    const res = await register(
      json({ role: "creator", displayName: "Kreator", email: "k@example.test", password: "rahasia-aman" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ profileProvisioned: false, provisionErrorCode: "server" });
  });
});

describe("POST /api/auth/provision", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never provisions admin from body or user_metadata", async () => {
    mocks.requireAuthUser.mockResolvedValue({ user: authUser({ role: "admin" }), userRow: null });

    const res = await provision(json({ role: "admin" }));

    expect(res.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps the stored role of an existing row", async () => {
    mocks.requireAuthUser.mockResolvedValue({
      user: authUser(),
      userRow: { id: "u-1", role: "creator", status: "active" },
    });
    mocks.rpc.mockResolvedValue({ data: { id: "u-1", role: "creator" }, error: null });

    const res = await provision(json({ role: "umkm" }));

    expect(res.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("provision_user", expect.objectContaining({ p_role: "creator" }));
  });

  it("uses the role recorded at register when the body has none", async () => {
    mocks.requireAuthUser.mockResolvedValue({ user: authUser({ role: "umkm" }), userRow: null });
    mocks.rpc.mockResolvedValue({ data: { id: "u-1", role: "umkm" }, error: null });

    const res = await provision(new Request("http://localhost/api", { method: "POST" }));

    expect(res.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("provision_user", expect.objectContaining({ p_role: "umkm" }));
  });

  it("401 when there is no session", async () => {
    const { HttpError } = await import("@/server/auth/http-error");
    mocks.requireAuthUser.mockRejectedValue(new HttpError(401, "Sesi tidak ditemukan."));

    const res = await provision(json({ role: "umkm" }));

    expect(res.status).toBe(401);
  });
});
