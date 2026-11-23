import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  mockDelay: vi.fn(),
  useMockData: false,
  db: null as unknown as FakeSupabase,
  userId: "user-1" as string | null,
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => mocks.db }));
vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getCurrentUserId: async () => mocks.userId,
}));

vi.mock("@/lib/api/call-api", () => ({ callApi: mocks.callApi }));

vi.mock("@/config/data-source.config", () => ({
  DATA_SOURCE_CONFIG: {
    get useMockData() {
      return mocks.useMockData;
    },
  },
}));

vi.mock("@/lib/mock-delay", () => ({ mockDelay: mocks.mockDelay }));

describe("T&C service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.useMockData = false;
    mocks.userId = "user-1";
  });

  it("reads status from own users row (port accept-tos action status)", async () => {
    mocks.db = createFakeSupabase({
      users: [
        { id: "user-1", tos_version: null, tos_accepted_at: null },
        { id: "user-2", tos_version: "v3.1", tos_accepted_at: "2026-09-01T00:00:00+00:00" },
      ],
    });
    const { getTosStatus } = await import("../tos.service");

    const result = await getTosStatus();

    expect(result).toEqual({
      success: true,
      data: { currentVersion: "v3.1", acceptedVersion: null, acceptedAt: null, needsConsent: true },
    });
    expect(mocks.db.calls).toEqual([{ table: "users", filters: ["id.eq.user-1"], count: undefined }]);
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("needsConsent false only when current version AND acceptedAt are set", async () => {
    mocks.db = createFakeSupabase({
      users: [{ id: "user-1", tos_version: "v3.1", tos_accepted_at: "2026-09-01T00:00:00+00:00" }],
    });
    const { getTosStatus } = await import("../tos.service");
    expect((await getTosStatus()).data).toEqual({
      currentVersion: "v3.1",
      acceptedVersion: "v3.1",
      acceptedAt: "2026-09-01T00:00:00+00:00",
      needsConsent: false,
    });

    mocks.db = createFakeSupabase({
      users: [{ id: "user-1", tos_version: "v2.0", tos_accepted_at: "2026-01-01T00:00:00+00:00" }],
    });
    expect((await getTosStatus()).data?.needsConsent).toBe(true);
  });

  it("missing users row → not_found; no session → auth", async () => {
    mocks.db = createFakeSupabase({ users: [] });
    const { getTosStatus } = await import("../tos.service");
    expect(await getTosStatus()).toMatchObject({ success: false, code: "not_found" });
    mocks.userId = null;
    expect(await getTosStatus()).toMatchObject({ success: false, code: "auth" });
  });

  it("accepts backend-returned version", async () => {
    mocks.callApi.mockResolvedValue({
      success: true,
      alreadyAccepted: false,
      tos_version: "v3.1",
    });
    const { acceptCurrentTos } = await import("../tos.service");

    await acceptCurrentTos("v3.1");

    expect(mocks.callApi).toHaveBeenCalledWith("acceptTos", {
      action: "accept",
      tos_version: "v3.1",
    });
  });

  it("returns accepted mock T&C status without calling Function", async () => {
    mocks.useMockData = true;
    const { getTosStatus } = await import("../tos.service");

    const result = await getTosStatus();

    expect(result).toMatchObject({
      success: true,
      data: {
        acceptedVersion: result.data?.currentVersion,
        acceptedAt: expect.any(String),
        needsConsent: false,
      },
    });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("accepts current mock T&C without calling Function", async () => {
    mocks.useMockData = true;
    const { acceptCurrentTos, getTosStatus } = await import("../tos.service");
    const status = await getTosStatus();

    const result = await acceptCurrentTos(status.data?.currentVersion ?? "");

    expect(result).toMatchObject({
      success: true,
      data: { alreadyAccepted: true, tos_version: status.data?.currentVersion },
    });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });
});
