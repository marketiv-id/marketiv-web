import { describe, expect, it } from "vitest";
import type { RatecardReview } from "@/types/ratecard-review.types";
import { getRatecardReviewState } from "../../ratecard-review/review-state";

function makeReview(overrides: Partial<RatecardReview> = {}): RatecardReview {
  return {
    orderId: "order-1",
    conversationId: "conversation-1",
    creatorId: "creator-1",
    creatorName: "Dina Kreatif",
    creatorAvatarUrl: "",
    projectTitle: "Video Produk",
    scope: "Satu video TikTok",
    packageContext: null,
    amount: 1_500_000,
    orderStatus: "in_progress",
    escrowStatus: "held",
    revisionCount: 0,
    revisionLimit: 2,
    latestDeliverable: {
      id: "deliverable-2",
      version: 2,
      status: "submitted",
      source: "external_url",
      fileUrl: "https://example.com/v2",
      notes: "Versi kedua",
      createdAt: "2026-09-04T10:00:00.000Z",
    },
    validation: { status: "pending" },
    deliverableHistory: [
      {
        id: "deliverable-1",
        version: 1,
        status: "approved",
        source: "external_url",
        fileUrl: "https://example.com/v1",
        notes: "Versi lama",
        createdAt: "2026-09-03T10:00:00.000Z",
      },
    ],
    revisionHistory: [],
    createdAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("getRatecardReviewState", () => {
  it("blocks approval while latest deliverable waits for Marketiv validation", () => {
    const state = getRatecardReviewState(makeReview());

    expect(state.title).toBe("Menunggu Validasi Marketiv");
    expect(state.filter).toBe("marketiv_validation");
    expect(state.canApprove).toBe(false);
  });

  it("allows approval and revision only for a valid latest submission", () => {
    const state = getRatecardReviewState(
      makeReview({ validation: { status: "valid", reviewedAt: "2026-09-04T11:00:00.000Z" } }),
    );

    expect(state.title).toBe("Validasi Marketiv Selesai");
    expect(state.subtitle).toBe("Siap Ditinjau");
    expect(state.canApprove).toBe(true);
    expect(state.canRequestRevision).toBe(true);
  });

  it("shows invalid notes, hides approval, and keeps backend-eligible revision", () => {
    const state = getRatecardReviewState(
      makeReview({ validation: { status: "invalid", reviewNotes: "Tautan tidak dapat dibuka." } }),
    );

    expect(state.title).toBe("Bukti Belum Lolos Validasi Marketiv");
    expect(state.canApprove).toBe(false);
    expect(state.canRequestRevision).toBe(true);
  });

  it("waits for Kreator after revision request", () => {
    const state = getRatecardReviewState(
      makeReview({
        orderStatus: "revision",
        latestDeliverable: {
          ...makeReview().latestDeliverable!,
          status: "revision_requested",
        },
      }),
    );

    expect(state.title).toBe("Menunggu Kreator Mengirim Versi Perbaikan");
    expect(state.filter).toBe("revision");
    expect(state.canApprove).toBe(false);
    expect(state.canRequestRevision).toBe(false);
  });

  it("makes completed work read-only", () => {
    const state = getRatecardReviewState(makeReview({ orderStatus: "completed" }));

    expect(state.title).toBe("Selesai");
    expect(state.filter).toBe("completed");
    expect(state.canApprove).toBe(false);
    expect(state.canRequestRevision).toBe(false);
  });

  it("uses latest v2 state and never makes v1 history actionable", () => {
    const review = makeReview({ validation: { status: "valid" } });
    const state = getRatecardReviewState(review);

    expect(state.actionableDeliverableId).toBe("deliverable-2");
    expect(state.actionableDeliverableId).not.toBe(review.deliverableHistory[0].id);
  });
});
