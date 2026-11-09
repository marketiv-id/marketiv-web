import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  usersRow: vi.fn(),
  profileRow: vi.fn(),
}));

vi.mock("@/config/data-source.config", () => ({
  DATA_SOURCE_CONFIG: { useMockData: false },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: table === "users" ? mocks.usersRow : mocks.profileRow,
        }),
      }),
    }),
  }),
}));

describe("session T&C fields (Supabase)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
          user_metadata: { display_name: "User" },
          app_metadata: {},
        },
      },
      error: null,
    });
    mocks.usersRow.mockResolvedValue({
      data: {
        role: "creator",
        status: "active",
        phone: null,
        email_verified_at: "2026-09-01T00:00:00.000Z",
        tos_version: "v3.1",
        tos_accepted_at: "2026-09-01T00:00:00.000Z",
      },
      error: null,
    });
    mocks.profileRow.mockResolvedValue({ data: { is_profile_completed: true }, error: null });
  });

  it("maps T&C version and acceptance time from authoritative users row", async () => {
    const { getSession } = await import("../session.service");

    const result = await getSession();

    expect(result.data).toMatchObject({
      userId: "user-1",
      role: "creator",
      name: "User",
      emailVerified: true,
      isProfileCompleted: true,
      tosVersion: "v3.1",
      tosAcceptedAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("omits blank T&C fields from session", async () => {
    mocks.usersRow.mockResolvedValue({
      data: { role: "creator", status: "active", tos_version: null, tos_accepted_at: null, email_verified_at: null },
      error: null,
    });
    const { getSession } = await import("../session.service");

    const result = await getSession();

    expect(result.data).not.toHaveProperty("tosVersion");
    expect(result.data).not.toHaveProperty("tosAcceptedAt");
    expect(result.data?.emailVerified).toBe(false);
  });

  it("returns not_found when the session has no users row", async () => {
    mocks.usersRow.mockResolvedValue({ data: null, error: null });
    const { getSession } = await import("../session.service");

    const result = await getSession();

    expect(result).toMatchObject({ success: false, code: "not_found" });
  });

  it("returns auth when there is no session", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError", status: 400 },
    });
    const { getSession } = await import("../session.service");

    const result = await getSession();

    expect(result).toMatchObject({ success: false, code: "auth" });
  });

  it("treats terminated accounts as suspended for the UI guard", async () => {
    mocks.usersRow.mockResolvedValue({
      data: { role: "umkm", status: "terminated", email_verified_at: null },
      error: null,
    });
    const { getSession } = await import("../session.service");

    const result = await getSession();

    expect(result.data?.status).toBe("suspended");
  });
});
