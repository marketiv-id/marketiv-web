// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { toCreatorView, toFollowersLabel } from "../creator.adapter";
import type { CreatorProfile } from "@/types/umkm-dashboard.types";

/** Normalisasi non-breaking space dari Intl compact (id-ID). */
const plain = (value: string) => value.replace(/\u00a0/g, " ");

const baseProfile: CreatorProfile = {
  id: "creator_001",
  name: "Ahmad Fauzi",
  username: "ahmadfauzi",
  avatarUrl: "",
  niche: "kuliner",
  bio: "Reviewer kuliner.",
  location: "Bandung",
  startingPrice: 350000,
  rating: 4.8,
  completedJobs: 42,
  engagementRate: 5.4,
  isVerified: true,
};

describe("toCreatorView — anti-fabrikasi", () => {
  it("tidak mengarang harga saat kreator belum punya rate card published", () => {
    const view = toCreatorView({ ...baseProfile, startingPrice: 0 });

    expect(view.estimatedSalary).toBe("Belum ada paket harga");
    expect(view.estimatedSalary).not.toContain("100.000");
  });

  it("tidak menaruh engagementRate di slot followers", () => {
    const view = toCreatorView(baseProfile);

    expect(view.followers).toBe("—");
    expect(view.followers).not.toContain("5.4");
    expect(view.followers).not.toBe("Aktif");
  });

  it("tidak mengklaim kreator terverifikasi lewat deskripsi bawaan", () => {
    const view = toCreatorView({ ...baseProfile, bio: "" });

    expect(view.description).not.toContain("terverifikasi");
    expect(view.description.toLowerCase()).toContain("belum");
  });

  it("tidak mengarang kota kreator", () => {
    const view = toCreatorView({ ...baseProfile, location: "" });

    expect(view.location).toBe("");
  });

  it("tetap meneruskan nilai nyata saat ada", () => {
    const view = toCreatorView(baseProfile);

    expect(view.description).toBe("Reviewer kuliner.");
    expect(view.location).toBe("Bandung");
    expect(view.estimatedSalary).toContain("350.000");
  });
});

describe("toFollowersLabel", () => {
  it("menjumlahkan followers akun nyata", () => {
    const label = toFollowersLabel([
      { id: "s1", platform: "tiktok", username: "a", followers: 15400, engagementRate: 0 },
      { id: "s2", platform: "instagram", username: "a", followers: 9800, engagementRate: 0 },
    ]);

    expect(plain(label)).toBe("25,2 rb");
  });

  it("menampilkan — saat belum ada angka followers (bukan 0/karangan)", () => {
    expect(toFollowersLabel([])).toBe("—");
    expect(
      toFollowersLabel([
        { id: "s1", platform: "tiktok", username: "a", followers: 0, engagementRate: 0 },
      ])
    ).toBe("—");
  });

  it("memakai agregat Function sebagai cadangan saat akun sosial belum terbaca", () => {
    expect(plain(toFollowersLabel([], 22000))).toBe("22 rb");
    expect(toFollowersLabel([], 0)).toBe("—");
    expect(plain(toFollowersLabel([{ id: "s1", platform: "tiktok", username: "a", followers: 15400, engagementRate: 0 }], 99999))).toBe(
      "15,4 rb"
    );
  });

  it("toCreatorView memakai agregat followers dari profil bila tersedia", () => {
    expect(plain(toCreatorView({ ...baseProfile, followers: 22000 }).followers)).toBe("22 rb");
    expect(toCreatorView(baseProfile).followers).toBe("—");
  });
});
