import { beforeEach, describe, expect, it, vi } from "vitest";
import { FunctionExecutionError } from "@/lib/api/errors";

const { callApiMock, getCurrentUserIdMock } = vi.hoisted(() => ({
  callApiMock: vi.fn(),
  getCurrentUserIdMock: vi.fn(),
}));

vi.mock("@/lib/api/call-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/call-api")>("@/lib/api/call-api");
  return { ...actual, callApi: callApiMock };
});

vi.mock("@/services/auth/session.service", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

import { publishCampaignInAppwrite, updateCampaignStatusInAppwrite } from "../umkm-appwrite.service";

describe("updateCampaignStatusInAppwrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue("umkm-1");
  });

  it("preserves route error message for mutation failure", async () => {
    callApiMock.mockRejectedValueOnce(
      new FunctionExecutionError("Hanya campaign aktif yang bisa dijeda.", 409, "validation")
    );

    const result = await updateCampaignStatusInAppwrite("campaign-1", "paused");

    expect(callApiMock).toHaveBeenCalledWith("patchCampaignStatus", { campaignId: "campaign-1", action: "pause" });
    expect(result.success).toBe(false);
    expect(result.code).toBe("validation");
    expect(result.error).toBe("Hanya campaign aktif yang bisa dijeda.");
  });

  it("maps the returned campaign row without a second read", async () => {
    callApiMock.mockResolvedValueOnce({
      campaign: { id: "campaign-1", umkm_id: "umkm-1", title: "Promo", status: "active", thumbnail_url: "" },
    });

    const result = await updateCampaignStatusInAppwrite("campaign-1", "active");

    expect(callApiMock).toHaveBeenCalledWith("patchCampaignStatus", { campaignId: "campaign-1", action: "resume" });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: "campaign-1", status: "active" });
  });

  it("publish surfaces the underfunded message", async () => {
    callApiMock.mockRejectedValueOnce(
      new FunctionExecutionError(
        "Dana campaign belum mencukupi target budget. Lakukan pembayaran/top-up terlebih dahulu.",
        409,
        "validation"
      )
    );
    const result = await publishCampaignInAppwrite("campaign-1");
    expect(callApiMock).toHaveBeenCalledWith("patchCampaignStatus", { campaignId: "campaign-1", action: "publish" });
    expect(result).toMatchObject({ success: false, code: "validation" });
    expect(result.error).toContain("Dana campaign belum mencukupi");
  });
});
