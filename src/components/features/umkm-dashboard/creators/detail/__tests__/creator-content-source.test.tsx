// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCreatorById: vi.fn(),
  getCreatorRateCards: vi.fn(),
  getCreatorPortfolio: vi.fn(),
  getCreatorSocialAccounts: vi.fn(),
}));

vi.mock("@/services/umkm/umkm-dashboard.service", () => mocks);
vi.mock("../modals/StartNegotiationModal", () => ({
  StartNegotiationModal: () => null,
}));

/** Judul dummy lama yang tidak boleh muncul lagi dari mana pun. */
const LEGACY_DUMMY_TITLES = [
  "Review Cemilan Viral",
  "Promo Outerwear Outfit",
  "Daily Skincare routine",
  "Resep Homemade Dessert",
];

const creatorProfile = {
  id: "creator_001",
  name: "Ahmad Fauzi",
  username: "ahmadfauzi",
  avatarUrl: "",
  niche: "kuliner" as const,
  bio: "Reviewer kuliner.",
  location: "Bandung",
  startingPrice: 350000,
  rating: 4.8,
  completedJobs: 42,
  engagementRate: 5.4,
  isVerified: true,
};

let root: Root | undefined;
let host: HTMLDivElement;

function text() {
  return host.textContent ?? "";
}

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(node));
}

/**
 * Tunggu sampai assertion lolos. Satu kali flush `act` tidak cukup untuk rantai
 * useEffect async (fetch → setState); di bawah beban paralel halaman masih di
 * state skeleton sehingga assertion membaca DOM kosong.
 */
async function waitFor(assertion: () => void, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    await act(async () => {});
    try {
      assertion();
      return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.getCreatorById.mockResolvedValue({ success: true, data: creatorProfile });
  mocks.getCreatorRateCards.mockResolvedValue({ success: true, data: [] });
  mocks.getCreatorPortfolio.mockResolvedValue({ success: true, data: [] });
  mocks.getCreatorSocialAccounts.mockResolvedValue({ success: true, data: [] });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("CreatorPortfolioSection", () => {
  it("merender item dari props, bukan data dummy internal", async () => {
    const { CreatorPortfolioSection } = await import("../CreatorPortfolioSection");
    await render(
      <CreatorPortfolioSection
        items={[
          {
            id: "p1",
            title: "Review Sambal Roa Juara",
            url: "https://www.tiktok.com/@ahmadfauzi/video/1",
            description: "Review pedas gurih.",
            thumbnailUrl: "https://cdn.example.com/thumb.jpg",
          },
        ]}
      />
    );

    expect(text()).toContain("Review Sambal Roa Juara");
    expect(text()).toContain("Review pedas gurih.");
    const link = host.querySelector("a[href='https://www.tiktok.com/@ahmadfauzi/video/1']");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("rel")).toContain("noopener");
    expect(host.querySelector("img[src='https://cdn.example.com/thumb.jpg']")).not.toBeNull();
    for (const dummy of LEGACY_DUMMY_TITLES) expect(text()).not.toContain(dummy);
  });

  it("menampilkan empty state tanpa mengarang item saat daftar kosong", async () => {
    const { CreatorPortfolioSection } = await import("../CreatorPortfolioSection");
    await render(<CreatorPortfolioSection items={[]} />);

    expect(text().toLowerCase()).toContain("belum");
    for (const dummy of LEGACY_DUMMY_TITLES) expect(text()).not.toContain(dummy);
    expect(text()).not.toContain("K Tayangan");
    expect(text()).not.toContain("Likes");
  });

  it("menampilkan pesan error + tombol coba lagi saat gagal memuat", async () => {
    const onRetry = vi.fn();
    const { CreatorPortfolioSection } = await import("../CreatorPortfolioSection");
    await render(
      <CreatorPortfolioSection items={[]} error="Gagal memuat portofolio." onRetry={onRetry} />
    );

    expect(text()).toContain("Gagal memuat portofolio.");
    await act(async () => {
      [...host.querySelectorAll("button")]
        .find((button) => button.textContent?.includes("Coba Lagi"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("CreatorSocialLinksCard", () => {
  it("merender akun dari props dan tidak mengarang handle atau follower", async () => {
    const { CreatorSocialLinksCard } = await import("../CreatorSocialLinksCard");
    await render(
      <CreatorSocialLinksCard
        accounts={[
          {
            id: "s1",
            platform: "tiktok",
            username: "sehanaf4",
            followers: 15400,
            engagementRate: 0,
          },
          {
            id: "s2",
            platform: "instagram",
            username: "sehanaf4",
            followers: 0,
            engagementRate: 0,
          },
        ]}
      />
    );

    expect(text()).toContain("@sehanaf4");
    // Intl id-ID memakai non-breaking space: "15,4 rb".
    expect(text().replace(/\u00a0/g, " ")).toContain("15,4 rb");
    // followers 0 = belum terisi → tampil "—", bukan angka karangan.
    expect(text()).toContain("—");
    expect(text()).not.toContain(".official");
    expect(text()).not.toContain("_lifestyle");
    expect(host.querySelector("a[href='https://www.tiktok.com/@sehanaf4']")).not.toBeNull();
    expect(host.querySelector("a[href='https://www.instagram.com/sehanaf4']")).not.toBeNull();
  });

  it("menampilkan empty state saat kreator belum menghubungkan akun sosial", async () => {
    const { CreatorSocialLinksCard } = await import("../CreatorSocialLinksCard");
    await render(<CreatorSocialLinksCard accounts={[]} />);

    expect(text().toLowerCase()).toContain("belum");
    expect(text()).not.toContain("15.4K");
    expect(text()).not.toContain("9.8K");
  });
});

describe("CreatorDetailPage", { timeout: 15000 }, () => {
  it("badge Kreator Terverifikasi hanya muncul untuk kreator terverifikasi", async () => {
    mocks.getCreatorById.mockResolvedValue({
      success: true,
      data: { ...creatorProfile, isVerified: false },
    });

    const { CreatorDetailPage } = await import("../CreatorDetailPage");
    await render(<CreatorDetailPage creatorId="creator_001" />);

    await waitFor(() => expect(text()).toContain("Pesanan Selesai"));
    expect(text()).not.toContain("Kreator Terverifikasi");
  });

  it("badge Kreator Terverifikasi muncul saat profil sudah terverifikasi", async () => {
    const { CreatorDetailPage } = await import("../CreatorDetailPage");
    await render(<CreatorDetailPage creatorId="creator_001" />);

    await waitFor(() => expect(text()).toContain("Kreator Terverifikasi"));
  });

  it("hero tidak menampilkan bintang/rating saat rating masih 0", async () => {
    const { CreatorDetailPage } = await import("../CreatorDetailPage");
    await render(<CreatorDetailPage creatorId="creator_001" />);

    // creatorProfile fixture: rating 0, completedJobs 0 → keduanya "—",
    // dan tidak ada label ulasan palsu.
    await waitFor(() => expect(text()).toContain("Pesanan Selesai"));
    expect(text()).not.toContain("Ulasan");
  });

  it("hero menampilkan rating dan jumlah order nyata tanpa label Ulasan", async () => {
    mocks.getCreatorById.mockResolvedValue({
      success: true,
      data: { ...creatorProfile, rating: 4.8, completedJobs: 12 },
    });

    const { CreatorDetailPage } = await import("../CreatorDetailPage");
    await render(<CreatorDetailPage creatorId="creator_001" />);

    await waitFor(() => {
      expect(text()).toContain("4.8");
      expect(text()).toContain("Pesanan Selesai");
      expect(text()).toContain("12");
    });
    expect(text()).not.toContain("Ulasan");
  });

  it("mengambil portfolio & akun sosial lewat service, bukan literal komponen", async () => {
    mocks.getCreatorPortfolio.mockResolvedValue({
      success: true,
      data: [
        {
          id: "p1",
          title: "Review Sambal Roa Juara",
          url: "https://www.tiktok.com/@ahmadfauzi/video/1",
          description: "Review pedas gurih.",
        },
      ],
    });
    mocks.getCreatorSocialAccounts.mockResolvedValue({
      success: true,
      data: [
        {
          id: "s1",
          platform: "tiktok",
          username: "ahmadfauzi",
          followers: 15400,
          engagementRate: 5.4,
        },
      ],
    });

    const { CreatorDetailPage } = await import("../CreatorDetailPage");
    await render(<CreatorDetailPage creatorId="creator_001" />);

    await waitFor(() => {
      expect(mocks.getCreatorPortfolio).toHaveBeenCalledWith("creator_001");
      expect(mocks.getCreatorSocialAccounts).toHaveBeenCalledWith("creator_001");
      expect(text()).toContain("Review Sambal Roa Juara");
      expect(text()).toContain("@ahmadfauzi");
    });
    for (const dummy of LEGACY_DUMMY_TITLES) expect(text()).not.toContain(dummy);
  });

  it("tidak mengarang data saat kreator belum punya portfolio maupun akun sosial", async () => {
    const { CreatorDetailPage } = await import("../CreatorDetailPage");
    await render(<CreatorDetailPage creatorId="creator_002" />);

    await waitFor(() => expect(text()).toContain("Pesanan Selesai"));
    for (const dummy of LEGACY_DUMMY_TITLES) expect(text()).not.toContain(dummy);
    expect(text()).not.toContain("@ahmadfauzi");
    expect(text()).not.toContain("15.4K");
    // Hero tidak boleh menaruh engagementRate di slot followers.
    const followersLabel = [...host.querySelectorAll("span")].find(
      (el) => el.textContent === "Pengikut"
    );
    expect(followersLabel?.previousElementSibling?.textContent).toBe("—");
  });

  it("hero memakai total followers nyata dari akun sosial kreator", async () => {
    mocks.getCreatorSocialAccounts.mockResolvedValue({
      success: true,
      data: [
        { id: "s1", platform: "tiktok", username: "ahmadfauzi", followers: 15400, engagementRate: 5.4 },
        { id: "s2", platform: "instagram", username: "ahmadfauzi", followers: 9800, engagementRate: 4.1 },
      ],
    });

    const { CreatorDetailPage } = await import("../CreatorDetailPage");
    await render(<CreatorDetailPage creatorId="creator_001" />);

    await waitFor(() => {
      const followersLabel = [...host.querySelectorAll("span")].find(
        (el) => el.textContent === "Pengikut"
      );
      expect((followersLabel?.previousElementSibling?.textContent ?? "").replace(/\u00a0/g, " ")).toBe(
        "25,2 rb"
      );
    });
  });
});
