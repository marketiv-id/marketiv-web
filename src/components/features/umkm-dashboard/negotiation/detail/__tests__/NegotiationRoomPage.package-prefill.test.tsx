// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getNegotiationById: vi.fn(),
  getMessagesByConversationId: vi.fn(),
  getCreatorRateCards: vi.fn(),
  getDeliverables: vi.fn(),
  markConversationRead: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => "/dashboard/umkm/negosiasi/conv-1",
  useSearchParams: () => new URLSearchParams("packageId=pkg-new"),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock("@/services/umkm/umkm-dashboard.service", () => ({
  getNegotiationById: mocks.getNegotiationById,
  getMessagesByConversationId: mocks.getMessagesByConversationId,
  getCreatorRateCards: mocks.getCreatorRateCards,
  sendMessage: vi.fn(),
  createOffer: vi.fn(),
  createOrderPayment: vi.fn(),
  cancelOrder: vi.fn(),
  deleteOffer: vi.fn(),
}));
vi.mock("@/services/shared/deliverable.service", () => ({
  getDeliverables: mocks.getDeliverables,
  approveDeliverable: vi.fn(),
  requestRevision: vi.fn(),
}));
vi.mock("@/services/shared/conversation.service", () => ({
  markConversationRead: mocks.markConversationRead,
}));
vi.mock("@/config/data-source.config", () => ({ DATA_SOURCE_CONFIG: { useMockData: false } }));
vi.mock("@/lib/supabase/realtime", () => ({ useRealtimeTable: vi.fn() }));
vi.mock("@/lib/negotiation/use-negotiation-room-sync", () => ({
  useNegotiationRoomSync: vi.fn(),
}));
vi.mock("@/components/ui/responsive-modal", () => ({
  ResponsiveModal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveModalDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ResponsiveModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveModalTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.getNegotiationById.mockResolvedValue({
    success: true,
    data: {
      id: "conv-1",
      conversationId: "conv-1",
      stage: "completed",
      creatorId: "creator-1",
      creatorName: "Ayu",
      creatorAvatarUrl: "",
      lastMessage: "Order lama selesai",
      lastMessageAt: "2026-09-01T00:00:00.000Z",
      unreadCount: 0,
      isArchived: false,
      offerId: "offer-old",
      offerStatus: "accepted",
      projectTitle: "Order Lama",
      scope: "Video lama",
      deadline: "2026-09-01T00:00:00.000Z",
      revisionCount: 1,
      packageContext: { id: "pkg-old", name: "Paket Lama", basePrice: 100_000 },
      orderId: "order-old",
      orderStatus: "completed",
      finalPrice: 90_000,
      platformFee: 0,
      totalAmount: 90_000,
    },
  });
  mocks.getMessagesByConversationId.mockResolvedValue({ success: true, data: [] });
  mocks.getDeliverables.mockResolvedValue({ success: true, data: [] });
  mocks.markConversationRead.mockResolvedValue({ success: true, data: 0 });
  mocks.getCreatorRateCards.mockResolvedValue({
    success: true,
    data: [
      {
        id: "pkg-new",
        creatorId: "creator-1",
        name: "Paket Baru",
        description: "Video baru",
        price: 250_000,
        deliverable: "1 video",
        estimatedDays: 7,
        revisionLimit: 2,
        status: "published",
      },
    ],
  });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("NegotiationRoomPage package candidate", () => {
  it("uses selected packageId as new-offer prefill after completed order", async () => {
    const { NegotiationRoomPage } = await import("../NegotiationRoomPage");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    await act(async () => {
      root?.render(<NegotiationRoomPage conversationId="conv-1" />);
    });

    expect(mocks.getCreatorRateCards).toHaveBeenCalledWith("creator-1");
    expect(document.body.textContent).toContain("Paket Acuan: Paket Baru");
    expect(document.body.textContent).not.toContain("Kesepakatan Final");

    await act(async () => {
      (document.querySelector('button[aria-label="Aksi cepat"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent?.includes("Kirim Penawaran Khusus"))
        ?.click();
    });

    expect(document.body.textContent).toContain("Paket Acuan: Paket Baru");
    expect((document.querySelector("#modal-scope") as HTMLTextAreaElement).value).toBe("Video baru");
    expect((document.querySelector("#modal-price") as HTMLInputElement).value).toBe("250000");
    expect((document.querySelector("#modal-revisions") as HTMLInputElement).value).toBe("2");
  });
});
