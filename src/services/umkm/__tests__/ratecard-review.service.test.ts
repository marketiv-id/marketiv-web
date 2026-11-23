import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
}));

vi.mock("@/lib/api/call-api", () => ({
  callApi: mocks.callApi,
}));

describe("UMKM Rate Card review service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads order-centric list from GET /api/umkm/ratecard-reviews", async () => {
    mocks.callApi.mockResolvedValue([{ orderId: "order-1" }]);
    const { getUmkmRatecardReviews } = await import("../ratecard-review.service");

    const result = await getUmkmRatecardReviews();

    expect(result).toEqual({ success: true, data: [{ orderId: "order-1" }] });
    expect(mocks.callApi).toHaveBeenCalledWith("umkmRatecardReviews", {});
  });

  it("loads one detail by orderId", async () => {
    mocks.callApi.mockResolvedValue({ orderId: "order-2" });
    const { getUmkmRatecardReview } = await import("../ratecard-review.service");

    const result = await getUmkmRatecardReview("order-2");

    expect(result).toEqual({ success: true, data: { orderId: "order-2" } });
    expect(mocks.callApi).toHaveBeenCalledWith("umkmRatecardReviews", {
      orderId: "order-2",
    });
  });

  it("preserves route error code for retry UX", async () => {
    const { FunctionExecutionError } = await import("@/lib/api/errors");
    mocks.callApi.mockRejectedValue(
      new FunctionExecutionError("Review gagal dimuat", 500, "server"),
    );
    const { getUmkmRatecardReviews } = await import("../ratecard-review.service");

    const result = await getUmkmRatecardReviews();

    expect(result).toMatchObject({ success: false, code: "server", data: [] });
  });
});
