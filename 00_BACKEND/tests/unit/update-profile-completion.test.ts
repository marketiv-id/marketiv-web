import { describe, expect, it } from "vitest";
import {
  evaluateUmkmCompletion,
  evaluateCreatorCompletion,
  nextProfileCompleted,
  umkmFailedFields,
} from "../../functions/update-profile/src/completion.js";

const umkmComplete = {
  businessName: "Dapur Sehat",
  category: "kuliner",
  city: "Sukabumi",
  description: "Deskripsi usaha yang cukup panjang minimal dua puluh karakter.",
  phone: "081234567890",
};

const creatorComplete = {
  displayName: "Nadia Visuals",
  niche: "fashion",
  city: "Bandung",
  bio: "Bio kreator yang cukup panjang minimal dua puluh karakter.",
  tiktokUsername: "nadia.visuals",
};

describe("evaluateUmkmCompletion", () => {
  it("returns true when all canonical UMKM fields are present", () => {
    expect(evaluateUmkmCompletion(umkmComplete)).toBe(true);
  });

  it("returns false when phone is missing", () => {
    expect(evaluateUmkmCompletion({ ...umkmComplete, phone: "" })).toBe(false);
    expect(evaluateUmkmCompletion({ ...umkmComplete, phone: null })).toBe(false);
    expect(evaluateUmkmCompletion({ ...umkmComplete, phone: undefined })).toBe(false);
  });

  it("returns false when phone is not Indonesian mobile format", () => {
    expect(evaluateUmkmCompletion({ ...umkmComplete, phone: "12345" })).toBe(false);
    expect(evaluateUmkmCompletion({ ...umkmComplete, phone: "021123456" })).toBe(false);
  });

  it("accepts 628 and +628 phone prefixes", () => {
    expect(evaluateUmkmCompletion({ ...umkmComplete, phone: "6281234567890" })).toBe(true);
    expect(evaluateUmkmCompletion({ ...umkmComplete, phone: "+6281234567890" })).toBe(true);
  });

  it("returns false when description is shorter than 20 characters", () => {
    expect(evaluateUmkmCompletion({ ...umkmComplete, description: "pendek" })).toBe(false);
  });

  it("returns false for description of exactly 19 characters", () => {
    expect(evaluateUmkmCompletion({ ...umkmComplete, description: "x".repeat(19) })).toBe(false);
  });

  it("returns true for description of exactly 20 characters when other fields valid", () => {
    expect(evaluateUmkmCompletion({ ...umkmComplete, description: "x".repeat(20) })).toBe(true);
  });

  it("returns false for invalid phone even when other fields valid", () => {
    expect(evaluateUmkmCompletion({ ...umkmComplete, phone: "not-a-phone" })).toBe(false);
  });

  it("trims whitespace before length check", () => {
    expect(
      evaluateUmkmCompletion({
        ...umkmComplete,
        description: `  ${"x".repeat(20)}  `,
      })
    ).toBe(true);
  });

  it("returns false when businessName, category, or city is empty", () => {
    expect(evaluateUmkmCompletion({ ...umkmComplete, businessName: "  " })).toBe(false);
    expect(evaluateUmkmCompletion({ ...umkmComplete, category: "" })).toBe(false);
    expect(evaluateUmkmCompletion({ ...umkmComplete, city: null })).toBe(false);
  });

  it("tiktok is not required for UMKM completion", () => {
    expect(evaluateUmkmCompletion(umkmComplete)).toBe(true);
  });
});

describe("evaluateCreatorCompletion", () => {
  it("returns true when all canonical creator fields are present", () => {
    expect(evaluateCreatorCompletion(creatorComplete)).toBe(true);
  });

  it("returns false when tiktok username is missing", () => {
    expect(evaluateCreatorCompletion({ ...creatorComplete, tiktokUsername: "" })).toBe(false);
    expect(evaluateCreatorCompletion({ ...creatorComplete, tiktokUsername: null })).toBe(false);
  });

  it("returns false when bio is shorter than 20 characters", () => {
    expect(evaluateCreatorCompletion({ ...creatorComplete, bio: "bio pendek" })).toBe(false);
  });

  it("returns false when niche or city is empty", () => {
    expect(evaluateCreatorCompletion({ ...creatorComplete, niche: "" })).toBe(false);
    expect(evaluateCreatorCompletion({ ...creatorComplete, city: "  " })).toBe(false);
  });

  it("returns false when displayName is empty", () => {
    expect(evaluateCreatorCompletion({ ...creatorComplete, displayName: "" })).toBe(false);
  });
});

describe("nextProfileCompleted", () => {
  it("keeps true when already completed even if evaluation fails", () => {
    expect(nextProfileCompleted(true, false)).toBe(true);
    expect(nextProfileCompleted(true, true)).toBe(true);
  });

  it("promotes false to true only when evaluation passes", () => {
    expect(nextProfileCompleted(false, true)).toBe(true);
    expect(nextProfileCompleted(false, false)).toBe(false);
  });

  it("never downgrades undefined current flag to true without evaluation", () => {
    expect(nextProfileCompleted(undefined, false)).toBe(false);
  });
});

describe("umkmFailedFields", () => {
  it("returns empty list when all UMKM fields pass", () => {
    expect(umkmFailedFields(umkmComplete)).toEqual([]);
  });

  it("lists only failing fields in rule order", () => {
    expect(
      umkmFailedFields({
        businessName: "",
        category: "",
        city: "",
        description: "x".repeat(19),
        phone: "bad",
      })
    ).toEqual(["businessName", "category", "city", "description", "phone"]);
  });

  it("flags invalid phone only when description meets minimum", () => {
    expect(
      umkmFailedFields({ ...umkmComplete, phone: "12345" })
    ).toEqual(["phone"]);
    expect(
      umkmFailedFields({ ...umkmComplete, description: "x".repeat(19), phone: "081234567890" })
    ).toEqual(["description"]);
  });
});
