import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  userId: "creator-1" as string | null,
  db: null as unknown as FakeSupabase,
  appwrite: { getDocument: vi.fn(), listDocuments: vi.fn(), createDocument: vi.fn(), deleteDocument: vi.fn() },
  executeFunction: vi.fn(),
}));

vi.mock("@/lib/api/call-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/call-api")>()),
  callApi: mocks.callApi,
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => mocks.db }));
vi.mock("@/lib/appwrite/databases", () => ({ databases: mocks.appwrite }));
vi.mock("@/lib/appwrite/functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/appwrite/functions")>()),
  executeFunction: mocks.executeFunction,
}));
vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getCurrentUserId: async () => mocks.userId,
}));

import { FunctionExecutionError } from "@/lib/api/call-api";

import { claimCampaignInAppwrite, unclaimCampaignInAppwrite } from "../creator-appwrite.service";

const noAppwrite = () => {
  for (const fn of Object.values(mocks.appwrite)) expect(fn).not.toHaveBeenCalled();
  expect(mocks.executeFunction).not.toHaveBeenCalled();
};

describe("klaim / batal klaim (Fase 7 — Route Handler + RPC)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userId = "creator-1";
    mocks.db = createFakeSupabase({
      campaign_claims: [
        { id: "claim-1", campaign_id: "campaign-1", creator_id: "creator-1", status: "claimed" },
        { id: "claim-x", campaign_id: "campaign-1", creator_id: "creator-9", status: "claimed" },
      ],
    });
  });

  it("klaim → callApi claimCampaign, kembalikan claimId", async () => {
    mocks.callApi.mockResolvedValueOnce({ claimId: "claim-9", campaignId: "campaign-1", status: "claimed" });
    await expect(claimCampaignInAppwrite("campaign-1")).resolves.toEqual({ success: true, data: "claim-9" });
    expect(mocks.callApi).toHaveBeenCalledWith("claimCampaign", { campaignId: "campaign-1" });
    noAppwrite();
  });

  it("respons klaim tanpa claimId → server error", async () => {
    mocks.callApi.mockResolvedValueOnce({});
    await expect(claimCampaignInAppwrite("campaign-1")).resolves.toMatchObject({ success: false, code: "server" });
  });

  it.each([
    [409, "validation", "Kuota kreator untuk campaign ini sudah penuh."],
    [403, "forbidden", "Akses kreator aktif diperlukan."],
    [404, "not_found", "Campaign tidak ditemukan."],
  ] as const)("klaim gagal %i → %s dengan pesan route", async (status, code, message) => {
    mocks.callApi.mockRejectedValueOnce(new FunctionExecutionError(message, status, code));
    await expect(claimCampaignInAppwrite("campaign-1")).resolves.toMatchObject({ success: false, code, error: message });
  });

  it("tanpa sesi → auth, tanpa request", async () => {
    mocks.userId = null;
    await expect(claimCampaignInAppwrite("campaign-1")).resolves.toMatchObject({ success: false, code: "auth" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("batal klaim: baca campaign_id lewat RLS (filter creator_id) lalu callApi unclaimCampaign", async () => {
    mocks.callApi.mockResolvedValueOnce({ success: true, claimId: "claim-1" });
    await expect(unclaimCampaignInAppwrite("claim-1")).resolves.toEqual({ success: true, data: null });
    expect(mocks.db.calls[0]).toMatchObject({ table: "campaign_claims", filters: ["id.eq.claim-1", "creator_id.eq.creator-1"] });
    expect(mocks.callApi).toHaveBeenCalledWith("unclaimCampaign", { campaignId: "campaign-1", claimId: "claim-1" });
    noAppwrite();
  });

  it("batal klaim milik orang lain / tidak ada → not_found tanpa request", async () => {
    await expect(unclaimCampaignInAppwrite("claim-x")).resolves.toMatchObject({ success: false, code: "not_found" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("respons batal klaim tidak valid → server", async () => {
    mocks.callApi.mockResolvedValueOnce({ success: true });
    await expect(unclaimCampaignInAppwrite("claim-1")).resolves.toMatchObject({ success: false, code: "server" });
  });

  it.each([[401, "auth"], [403, "forbidden"], [404, "not_found"], [409, "validation"], [500, "server"]] as const)(
    "batal klaim HTTP %i → %s",
    async (status, code) => {
      mocks.callApi.mockRejectedValueOnce(new FunctionExecutionError("backend error", status, code));
      await expect(unclaimCampaignInAppwrite("claim-1")).resolves.toMatchObject({ success: false, code, error: "backend error" });
    },
  );
});
