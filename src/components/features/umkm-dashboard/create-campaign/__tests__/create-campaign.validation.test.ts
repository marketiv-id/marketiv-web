import { describe, it, expect } from "vitest";
import { validateStepFields, isStepCompleted } from "../create-campaign.validation";
import type { CampaignWizardState } from "../types";

const THUMB =
  "https://api.example.test/v1/storage/buckets/campaign-assets/files/abc1/view";

const step1State = (thumbnailUrl: string): CampaignWizardState => ({
  title: "Kopi susu gula aren",
  thumbnailUrl,
  category: "kuliner",
  type: "ugc",
  description: "Deskripsi produk campaign yang cukup panjang untuk lolos validasi.",
  location: "",
  brief: "",
  videoStyle: "santai",
  requiredPoints: "",
  callToAction: "Kunjungi UMKM",
  hashtags: "",
  externalAssetUrl: "",
  assetNotes: "",
  pricePerThousandViews: 5000,
  totalBudgetEscrow: 100000,
  creatorQuota: 10,
  termsAgreed: false,
});

const legacy = { thumbnailOptional: true };

describe("step 1 — campaign BARU (default, tanpa options)", () => {
  it("thumbnail kosong → GAGAL (final submission new campaign diblokir)", () => {
    const errs = validateStepFields(1, step1State(""));
    expect(errs.thumbnailUrl).toContain("Gambar produk campaign wajib diunggah.");
    expect(isStepCompleted(1, step1State(""))).toBe(false);
  });

  it("thumbnail terisi → PASS", () => {
    expect(validateStepFields(1, step1State(THUMB))).toEqual({});
    expect(isStepCompleted(1, step1State(THUMB))).toBe(true);
  });
});

describe("step 1 — LEGACY EDIT (thumbnailOptional)", () => {
  it("legacy tanpa thumbnail, field lain valid → PASS (save tanpa paksaan)", () => {
    expect(validateStepFields(1, step1State(""), legacy)).toEqual({});
    expect(isStepCompleted(1, step1State(""), legacy)).toBe(true);
  });

  it("legacy menambah thumbnail → PASS", () => {
    expect(validateStepFields(1, step1State(THUMB), legacy)).toEqual({});
    expect(isStepCompleted(1, step1State(THUMB), legacy)).toBe(true);
  });

  it("field wajib lain tetap divalidasi (edit unrelated field tetap disiplin)", () => {
    const errs = validateStepFields(1, { ...step1State(""), title: "" }, legacy);
    expect(errs.title).toContain("Judul campaign wajib diisi.");
    expect(isStepCompleted(1, { ...step1State(""), title: "" }, legacy)).toBe(false);
  });

  it("format thumbnail tetap divalidasi saat legacy mengisi thumbnail", () => {
    const errs = validateStepFields(
      1,
      step1State(`https://x.test/${"a".repeat(2100)}`),
      legacy
    );
    expect(errs.thumbnailUrl).toContain("URL gambar produk maksimal 2048 karakter.");
  });
});
