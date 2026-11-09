import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/data-source.config", () => ({
  DATA_SOURCE_CONFIG: { useMockData: false },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getMockSessionUser: vi.fn(),
  setMockRole: vi.fn(),
}));

const fetchMock = vi.fn();

describe("registerUmkm contract (Supabase)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ userId: "user-1", sessionCreated: true, profileProvisioned: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const session = await import("@/services/auth/session.service");
    vi.mocked(session.getSession).mockResolvedValue({
      success: true,
      data: {
        userId: "user-1",
        email: "owner@usaha.id",
        role: "umkm",
        status: "active",
        emailVerified: false,
        isProfileCompleted: false,
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("posts account-only UMKM input with a server-whitelisted role and never business placeholders", async () => {
    const { registerUmkm } = await import("@/services/auth/auth.service");

    const result = await registerUmkm({
      email: "owner@usaha.id",
      phone: "08123456789",
      password: "rahasia-aman",
    });

    expect(result.success).toBe(true);
    expect(result.data.profileProvisioned).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/register");
    expect(JSON.parse(init.body)).toEqual({
      role: "umkm",
      email: "owner@usaha.id",
      phone: "08123456789",
      password: "rahasia-aman",
    });
  }, 15000);

  it("reports provisioning failure as success with profileProvisioned:false", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          userId: "user-1",
          sessionCreated: true,
          profileProvisioned: false,
          provisionErrorCode: "server",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const { registerUmkm } = await import("@/services/auth/auth.service");

    const result = await registerUmkm({
      email: "owner@usaha.id",
      phone: "08123456789",
      password: "rahasia-aman",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ profileProvisioned: false, provisionErrorCode: "server" });
  });

  it("passes server error message and code through", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Email ini sudah terdaftar.", code: "validation" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    );
    const { registerUmkm } = await import("@/services/auth/auth.service");

    const result = await registerUmkm({
      email: "owner@usaha.id",
      phone: "08123456789",
      password: "rahasia-aman",
    });

    expect(result).toMatchObject({ success: false, code: "validation", error: "Email ini sudah terdaftar." });
  });

  it("does not require businessName or category", async () => {
    const { registerUmkmSchema } = await import("@/lib/validations/auth.schema");

    expect(registerUmkmSchema.safeParse({
      email: "owner@usaha.id",
      phone: "08123456789",
      password: "rahasia-aman",
    }).success).toBe(true);
  });
});
