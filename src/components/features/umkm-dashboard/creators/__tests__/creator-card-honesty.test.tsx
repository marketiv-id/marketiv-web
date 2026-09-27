// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Creator } from "@/types/campaign";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const baseCreator: Creator = {
  id: "creator_001",
  name: "Ahmad Fauzi",
  username: "ahmadfauzi",
  description: "Reviewer kuliner.",
  category: "Kuliner",
  imageUrl: "",
  estimatedSalary: "Rp 350.000",
  followers: "",
  rating: 0,
  totalReviews: 0,
  isVerified: true,
  location: "Bandung",
  engagementRate: 0,
  completedJobs: 0,
};

let root: Root | undefined;
let host: HTMLDivElement;

function text() {
  return host.textContent ?? "";
}

async function renderCard(creator: Creator) {
  const { CreatorCard } = await import("../CreatorCard");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<CreatorCard creator={creator} />));
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("CreatorCard — anti-fabrikasi", () => {
  it("tidak mengarang handle dari nama saat username belum dihubungkan", async () => {
    await renderCard({ ...baseCreator, username: undefined });

    expect(text()).not.toContain("@ahmadfauzi");
    expect(text()).not.toContain("@");
  });

  it("menampilkan handle asli saat ada", async () => {
    await renderCard(baseCreator);

    expect(text()).toContain("@ahmadfauzi");
  });

  it("menampilkan — di kotak Engagement dan Order Selesai saat nilainya 0", async () => {
    await renderCard(baseCreator);

    expect(text()).not.toContain("Aktif");
    const values = [...host.querySelectorAll("span")].filter((el) => el.textContent === "—");
    expect(values.length).toBe(2);
  });

  it("menampilkan angka asli saat datanya ada", async () => {
    await renderCard({ ...baseCreator, engagementRate: 5.4, completedJobs: 42 });

    expect(text()).toContain("5.4%");
    expect(text()).toContain("42");
    expect(text()).not.toContain("—");
  });
});
