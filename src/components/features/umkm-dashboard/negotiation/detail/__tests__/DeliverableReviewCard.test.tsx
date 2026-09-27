// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

let root: Root | undefined;
let host: HTMLDivElement;

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("DeliverableReviewCard", () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  it.each([
    ["pending", "Hasil kerja telah dikirim", "Menunggu Validasi Marketiv", "Buka Tinjauan Pekerjaan"],
    ["valid", "Hasil kerja siap ditinjau", "Validasi Marketiv selesai", "Tinjau Sekarang"],
    ["revision", "Revisi telah diminta", "Menunggu Kreator mengirim versi baru", "Lihat Tinjauan"],
    ["completed", "Pekerjaan selesai", "Hasil akhir tersedia", "Lihat Hasil Akhir"],
  ] as const)("links %s state to dedicated order review", async (state, title, subtitle, cta) => {
    const { DeliverableReviewCard } = await import("../DeliverableReviewCard");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(
      <DeliverableReviewCard orderId="order-7" state={state} />,
    ));

    expect(document.body.textContent).toContain(title);
    expect(document.body.textContent).toContain(subtitle);
    expect(document.body.textContent).toContain(cta);
    expect(document.querySelector("a")?.getAttribute("href")).toBe(
      "/dashboard/umkm/review-rate-card/order-7",
    );
    expect(document.querySelector("button")).toBeNull();
  });
});
