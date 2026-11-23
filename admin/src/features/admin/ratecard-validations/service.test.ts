import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubFetch } from "@/test/fetch-mock";

const createExecution = vi.fn();
vi.mock("@/lib/admin/appwrite", () => ({ functions: { createExecution }, FUNCTION_IDS: {} }));

const { reviewRateCardDeliverable } = await import("./service");
let api: ReturnType<typeof stubFetch>;

describe("reviewRateCardDeliverable (route)", () => {
  beforeEach(() => {
    api = stubFetch();
    createExecution.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("POST route dengan deliverableId di path; Appwrite tidak dipanggil", async () => {
    api.respond(200, { success: true, deliverableId: "d 1", decision: "invalid", reviewedAt: "2026-11-23T00:00:00Z" });
    await expect(reviewRateCardDeliverable("d 1", "invalid", "Buram")).resolves.toMatchObject({ decision: "invalid" });
    expect(api.calls).toEqual([{ url: "/api/admin/ratecard-deliverables/d%201/review", method: "POST" }]);
    expect(JSON.parse(String((api.fn.mock.calls[0][1] as RequestInit).body))).toEqual({ decision: "invalid", notes: "Buram" });
    expect(createExecution).not.toHaveBeenCalled();
  });

  it("409 diteruskan dengan pesan route", async () => {
    api.respond(409, { error: "Deliverable sudah memiliki keputusan final." });
    await expect(reviewRateCardDeliverable("d1", "valid", "")).rejects.toMatchObject({
      statusCode: 409,
      message: "Deliverable sudah memiliki keputusan final.",
    });
  });

  it("deliverableId kosong → 400 tanpa request", async () => {
    await expect(reviewRateCardDeliverable("", "valid", "")).rejects.toMatchObject({ statusCode: 400 });
    expect(api.calls).toHaveLength(0);
  });
});
