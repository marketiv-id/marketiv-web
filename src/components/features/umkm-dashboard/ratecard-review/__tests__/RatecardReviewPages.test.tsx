// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RatecardReview } from "@/types/ratecard-review.types";

const mocks = vi.hoisted(() => ({
  getList: vi.fn(),
  getDetail: vi.fn(),
  approve: vi.fn(),
  revise: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock("@/services/umkm/ratecard-review.service", () => ({
  getUmkmRatecardReviews: mocks.getList,
  getUmkmRatecardReview: mocks.getDetail,
}));
vi.mock("@/services/shared/deliverable.service", () => ({
  approveDeliverable: mocks.approve,
  requestRevision: mocks.revise,
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock("@/components/ui/responsive-modal", () => ({
  ResponsiveModal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  ResponsiveModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveModalTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  ResponsiveModalDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  ResponsiveModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function makeReview(overrides: Partial<RatecardReview> = {}): RatecardReview {
  return {
    orderId: "order-1",
    conversationId: "conversation-1",
    creatorId: "creator-1",
    creatorName: "Dina Kreatif",
    creatorAvatarUrl: "",
    projectTitle: "Video Produk",
    scope: "Satu video TikTok",
    packageContext: {
      id: "package-1",
      name: "Paket Starter",
      description: "Video produk singkat",
      output: "1 video",
      deliveryDays: 7,
      basePrice: 1_500_000,
    },
    amount: 1_500_000,
    orderStatus: "in_progress",
    escrowStatus: "held",
    revisionCount: 1,
    revisionLimit: 2,
    latestDeliverable: {
      id: "deliverable-2",
      version: 2,
      status: "submitted",
      source: "external_url",
      fileUrl: "https://example.com/v2",
      notes: "Versi terbaru",
      createdAt: "2026-09-04T10:00:00.000Z",
    },
    validation: { status: "pending" },
    deliverableHistory: [{
      id: "deliverable-1",
      version: 1,
      status: "revision_requested",
      source: "external_url",
      fileUrl: "https://example.com/v1",
      notes: "Versi lama",
      createdAt: "2026-09-03T10:00:00.000Z",
    }],
    revisionHistory: [],
    createdAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

let root: Root | undefined;
let host: HTMLDivElement;

async function render(element: React.ReactNode) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(element));
}

function button(label: string) {
  return [...document.querySelectorAll("button")].find((node) => node.textContent?.includes(label));
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.approve.mockResolvedValue({ success: true, data: null });
  mocks.revise.mockResolvedValue({ success: true, data: null });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("RatecardReviewListPage", () => {
  it("covers loading, empty, error retry, and required filters", async () => {
    let resolveList!: (value: unknown) => void;
    mocks.getList.mockReturnValueOnce(new Promise((resolve) => { resolveList = resolve; }));
    const { RatecardReviewListPage } = await import("../RatecardReviewListPage");
    await render(<RatecardReviewListPage />);

    expect(document.querySelector('[aria-label="Memuat tinjauan pekerjaan"]')).not.toBeNull();
    await act(async () => resolveList({ success: true, data: [] }));
    expect(document.body.textContent).toContain("Belum ada pekerjaan Paket Harga untuk ditinjau.");
    expect(document.body.textContent).toContain("Hasil kerja Kreator akan muncul di sini setelah dikirim.");

    await act(async () => root?.unmount());
    host.remove();
    mocks.getList
      .mockResolvedValueOnce({ success: false, data: [], error: "Jaringan terputus" })
      .mockResolvedValueOnce({ success: true, data: [] });
    await render(<RatecardReviewListPage />);
    expect(document.body.textContent).toContain("Jaringan terputus");
    await act(async () => button("Coba Lagi")?.click());
    expect(mocks.getList).toHaveBeenCalledTimes(3);

    expect(["Perlu Tindakan", "Menunggu Marketiv", "Revisi", "Selesai"].every(
      (label) => document.body.textContent?.includes(label),
    )).toBe(true);
  });

  it("prioritizes action-required cards and links by orderId", async () => {
    mocks.getList.mockResolvedValue({
      success: true,
      data: [
        makeReview({ orderId: "order-complete", orderStatus: "completed" }),
        makeReview({ orderId: "order-action", validation: { status: "valid" } }),
      ],
    });
    const { RatecardReviewListPage } = await import("../RatecardReviewListPage");
    await render(<RatecardReviewListPage />);

    const links = [...document.querySelectorAll("a")];
    expect(links[0].getAttribute("href")).toBe("/dashboard/umkm/review-rate-card/order-action");
    expect(document.body.textContent).toContain("Versi 2");
    expect(document.body.textContent).toMatch(/Rp\s*1\.500\.000/);
  });
});

describe("RatecardReviewDetailPage", () => {
  it("hides approval while validation is pending", async () => {
    mocks.getDetail.mockResolvedValue({ success: true, data: makeReview() });
    const { RatecardReviewDetailPage } = await import("../RatecardReviewDetailPage");
    await render(<RatecardReviewDetailPage orderId="order-1" />);

    expect(document.body.textContent).toContain("Menunggu Validasi Marketiv");
    expect(button("Setujui Hasil Kerja")).toBeUndefined();
  });

  it("shows invalid validation notes and hides approval", async () => {
    mocks.getDetail.mockResolvedValue({
      success: true,
      data: makeReview({ validation: { status: "invalid", reviewNotes: "Tautan tidak dapat dibuka." } }),
    });
    const { RatecardReviewDetailPage } = await import("../RatecardReviewDetailPage");
    await render(<RatecardReviewDetailPage orderId="order-1" />);

    expect(document.body.textContent).toContain("Bukti Belum Lolos Validasi Marketiv");
    expect(document.body.textContent).toContain("Tautan tidak dapat dibuka.");
    expect(button("Setujui Hasil Kerja")).toBeUndefined();
  });

  it("shows revision waiting and completed work as read-only", async () => {
    const { RatecardReviewDetailPage } = await import("../RatecardReviewDetailPage");
    mocks.getDetail.mockResolvedValueOnce({
      success: true,
      data: makeReview({
        orderStatus: "revision",
        latestDeliverable: { ...makeReview().latestDeliverable!, status: "revision_requested" },
      }),
    });
    await render(<RatecardReviewDetailPage orderId="order-1" />);
    expect(document.body.textContent).toContain("Menunggu Kreator Mengirim Versi Perbaikan");
    expect(button("Setujui Hasil Kerja")).toBeUndefined();

    await act(async () => root?.unmount());
    host.remove();
    mocks.getDetail.mockResolvedValueOnce({
      success: true,
      data: makeReview({ orderStatus: "completed", escrowStatus: "released" }),
    });
    await render(<RatecardReviewDetailPage orderId="order-1" />);
    expect(document.body.textContent).toContain("Dana Dicairkan");
    expect(button("Minta Revisi")).toBeUndefined();
  });

  it("approves latest v2 then refetches authoritative detail", async () => {
    const valid = makeReview({ validation: { status: "valid" } });
    mocks.getDetail.mockResolvedValue({ success: true, data: valid });
    const { RatecardReviewDetailPage } = await import("../RatecardReviewDetailPage");
    await render(<RatecardReviewDetailPage orderId="order-1" />);

    expect(document.body.textContent).toContain("Validasi Marketiv Selesai");
    expect(button("Minta Revisi")).not.toBeUndefined();
    expect(document.querySelector('a[href="https://example.com/v1"]')?.closest("section")?.querySelector("button")).toBeNull();
    await act(async () => button("Setujui Hasil Kerja")?.click());
    expect(document.body.textContent).toContain("melanjutkan penyelesaian");
    await act(async () => (document.querySelector('input[type="checkbox"]') as HTMLInputElement).click());
    await act(async () => button("Setujui & Lanjutkan")?.click());

    expect(mocks.approve).toHaveBeenCalledWith("order-1", "deliverable-2");
    expect(mocks.getDetail).toHaveBeenCalledTimes(2);
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it("submits revision and refetches authoritative detail", async () => {
    mocks.getDetail.mockResolvedValue({
      success: true,
      data: makeReview({ validation: { status: "valid" } }),
    });
    const { RatecardReviewDetailPage } = await import("../RatecardReviewDetailPage");
    await render(<RatecardReviewDetailPage orderId="order-1" />);

    await act(async () => button("Minta Revisi")?.click());
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(textarea, "Perbesar logo pada penutup video.");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => button("Kirim Permintaan")?.click());

    expect(mocks.revise).toHaveBeenCalledWith({
      orderId: "order-1",
      message: "Perbesar logo pada penutup video.",
    });
    expect(mocks.getDetail).toHaveBeenCalledTimes(2);
  });
});
