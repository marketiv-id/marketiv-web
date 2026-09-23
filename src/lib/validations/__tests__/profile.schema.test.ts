import { describe, expect, it } from "vitest";
import { creatorProfileUpdateSchema, umkmProfileUpdateSchema } from "../profile.schema";

const validCreatorProfile = {
  displayName: "Nadia Visuals",
  niche: "fashion",
  city: "Bandung",
  bio: "Bio kreator yang cukup panjang minimal dua puluh karakter.",
};

describe("creatorProfileUpdateSchema", () => {
  it("menerima profil lengkap dengan bio tepat 20 karakter", () => {
    const result = creatorProfileUpdateSchema.safeParse({
      ...validCreatorProfile,
      bio: "x".repeat(20),
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ["displayName kosong", { displayName: "" }, "displayName"],
    ["displayName hilang", { displayName: undefined }, "displayName"],
    ["niche kosong", { niche: "" }, "niche"],
    ["niche hilang", { niche: undefined }, "niche"],
    ["niche di luar enum", { niche: "teknologi" }, "niche"],
    ["city kosong", { city: "" }, "city"],
    ["city hilang", { city: undefined }, "city"],
    ["bio kosong", { bio: "" }, "bio"],
    ["bio hilang", { bio: undefined }, "bio"],
    ["bio 19 karakter", { bio: "x".repeat(19) }, "bio"],
  ])("menolak %s", (_case, changes, field) => {
    const result = creatorProfileUpdateSchema.safeParse({ ...validCreatorProfile, ...changes });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
  });
});

const validUmkmProfile = {
  businessName: "Kopi Pagi",
  category: "kuliner",
  description: "x".repeat(20),
  city: "Bandung",
  phone: "08123456789",
  address: "",
  tiktok: "",
};

describe("umkmProfileUpdateSchema", () => {
  it.each([
    ["description kosong", { description: "" }, "description"],
    ["description 19 karakter", { description: "x".repeat(19) }, "description"],
    ["city kosong", { city: "" }, "city"],
    ["phone tidak ada", { phone: undefined }, "phone"],
    ["phone kosong", { phone: "" }, "phone"],
    ["phone invalid", { phone: "08123" }, "phone"],
  ])("menolak %s", (_case, changes, field) => {
    const result = umkmProfileUpdateSchema.safeParse({ ...validUmkmProfile, ...changes });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
  });

  it.each(["08123456789", "628123456789", "+628123456789"])(
    "menerima format phone Indonesia %s",
    (phone) => {
      expect(umkmProfileUpdateSchema.safeParse({ ...validUmkmProfile, phone }).success).toBe(true);
    }
  );

  it("menerima description tepat 20 karakter serta address dan tiktok kosong", () => {
    const result = umkmProfileUpdateSchema.safeParse(validUmkmProfile);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toHaveLength(20);
      expect(result.data.address).toBe("");
      expect(result.data.tiktok).toBe("");
    }
  });
});
