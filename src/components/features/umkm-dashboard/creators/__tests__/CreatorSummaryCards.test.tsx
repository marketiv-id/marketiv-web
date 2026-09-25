// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CreatorSummaryCards } from "../CreatorSummaryCards";

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("CreatorSummaryCards", () => {
  it("renders 4 metric cards correctly with formatted values", async () => {
    await act(async () => {
      root?.render(
        <CreatorSummaryCards
          totalCreators={16}
          verifiedCount={12}
          avgEngagement={5.8}
          lowestStartingPrice={150000}
          isLoading={false}
        />
      );
    });

    const text = host.textContent || "";
    expect(text).toContain("Kreator Terdaftar");
    expect(text).toContain("16");
    expect(text).toContain("Kreator");

    expect(text).toContain("Kreator Terverifikasi");
    expect(text).toContain("12");
    expect(text).toContain("75%");

    expect(text).toContain("Rata-rata Engagement");
    expect(text).toContain("5.8%");

    expect(text).toContain("Tarif Mulai Dari");
    expect(text).toContain("Rp 150 rb");
  });

  it("renders loading skeleton placeholders when isLoading is true", async () => {
    await act(async () => {
      root?.render(
        <CreatorSummaryCards
          totalCreators={0}
          isLoading={true}
        />
      );
    });

    const skeleton = host.querySelector("[data-testid='creator-summary-skeleton']");
    expect(skeleton).not.toBeNull();
    expect(host.textContent).not.toContain("Kreator Terdaftar");
  });

  it("handles zero/empty metrics gracefully without NaN or crashes", async () => {
    await act(async () => {
      root?.render(
        <CreatorSummaryCards
          totalCreators={0}
          verifiedCount={0}
          avgEngagement={0}
          lowestStartingPrice={0}
          isLoading={false}
        />
      );
    });

    const text = host.textContent || "";
    expect(text).toContain("0%");
    expect(text).toContain("Rp 0");
  });
});
