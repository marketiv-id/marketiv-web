import { describe, it, expect } from "vitest";
import {
  isCloudStorageFolderUrl,
  campaignStepSchemas,
  legacyEditStep1Schema,
  APPROVED_CLOUD_STORAGE_DOMAINS,
} from "../campaign.schema";

describe("Cloud Storage URL Validation", () => {
  describe("isCloudStorageFolderUrl", () => {
    it("accepts Google Drive URLs", () => {
      expect(isCloudStorageFolderUrl("https://drive.google.com/drive/folders/1abcXYZ_456")).toBe(true);
      expect(isCloudStorageFolderUrl("https://drive.google.com/file/d/1abcXYZ_456/view")).toBe(true);
    });

    it("accepts Dropbox URLs", () => {
      expect(isCloudStorageFolderUrl("https://dropbox.com/scl/fo/abc123xyz/folder")).toBe(true);
      expect(isCloudStorageFolderUrl("https://www.dropbox.com/sh/abc123xyz/folder")).toBe(true);
    });

    it("accepts Microsoft OneDrive and SharePoint URLs", () => {
      expect(isCloudStorageFolderUrl("https://onedrive.live.com/?id=root&cid=123")).toBe(true);
      expect(isCloudStorageFolderUrl("https://1drv.ms/f/s!AnvX123456")).toBe(true);
      expect(isCloudStorageFolderUrl("https://marketiv-my.sharepoint.com/:f:/g/personal/user/abc")).toBe(true);
    });

    it("rejects streaming and social media URLs", () => {
      expect(isCloudStorageFolderUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
      expect(isCloudStorageFolderUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(false);
      expect(isCloudStorageFolderUrl("https://www.tiktok.com/@creator/video/1234567890")).toBe(false);
      expect(isCloudStorageFolderUrl("https://instagram.com/reel/abc123xyz/")).toBe(false);
    });

    it("rejects non-https URLs even if domain matches", () => {
      expect(isCloudStorageFolderUrl("http://drive.google.com/folders/123")).toBe(false);
      expect(isCloudStorageFolderUrl("ftp://dropbox.com/folder")).toBe(false);
    });

    it("rejects invalid URL formats and empty inputs", () => {
      expect(isCloudStorageFolderUrl("")).toBe(false);
      expect(isCloudStorageFolderUrl("    ")).toBe(false);
      expect(isCloudStorageFolderUrl("just-some-text")).toBe(false);
      expect(isCloudStorageFolderUrl("https://")).toBe(false);
    });
  });

  describe("campaignStepSchemas[3] integration", () => {
    const schema = campaignStepSchemas[3];

    it("passes for valid Google Drive folder URL", () => {
      const result = schema.safeParse({
        externalAssetUrl: "https://drive.google.com/drive/folders/1XYZ-folder-id",
      });
      expect(result.success).toBe(true);
    });

    it("fails with appropriate error message for YouTube link", () => {
      const result = schema.safeParse({
        externalAssetUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.flatten().fieldErrors.externalAssetUrl;
        expect(error).toContain(
          "Tautan harus berupa link folder Google Drive, Dropbox, atau OneDrive (awali https://)."
        );
      }
    });

    it("fails with required message for empty link", () => {
      const result = schema.safeParse({
        externalAssetUrl: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.flatten().fieldErrors.externalAssetUrl;
        expect(error).toContain("Tautan aset eksternal wajib diisi.");
      }
    });
  });
});

describe("Brief Detail Composition & Decomposition with Arahan Cepat", () => {
  it("losslessly round-trips brief with selectedDirections", async () => {
    const { composeBriefDetail, decomposeBriefDetail } = await import("../campaign.schema");

    const input = {
      brief: "Review video yang menarik dan fun.",
      selectedDirections: ["Tampilkan produk", "Detail kemasan"],
      requiredPoints: "- Wajib: Produk terlihat jelas\n- Hindari: Sebut kompetitor",
      hashtags: "#KeripikTempe #Kuliner",
      location: "Bandung",
      assetNotes: "Gunakan logo versi transparan.",
    };

    const composed = composeBriefDetail(input);
    expect(composed).toContain("Arahan Cepat: Tampilkan produk, Detail kemasan");

    const decomposed = decomposeBriefDetail(composed);
    expect(decomposed.lossy).toBe(false);
    expect(decomposed.brief).toBe(input.brief);
    expect(decomposed.selectedDirections).toEqual(["Tampilkan produk", "Detail kemasan"]);
    expect(decomposed.requiredPoints).toBe(input.requiredPoints);
    expect(decomposed.hashtags).toBe(input.hashtags);
    expect(decomposed.location).toBe(input.location);
    expect(decomposed.assetNotes).toBe(input.assetNotes);
  });

  it("maintains backward compatibility when selectedDirections is empty", async () => {
    const { composeBriefDetail, decomposeBriefDetail } = await import("../campaign.schema");

    const input = {
      brief: "Brief lama tanpa arahan cepat.",
      requiredPoints: "- Wajib: Produk terlihat jelas",
      hashtags: "",
      location: "",
      assetNotes: "",
    };

    const composed = composeBriefDetail(input);
    expect(composed).not.toContain("Arahan Cepat:");

    const decomposed = decomposeBriefDetail(composed);
    expect(decomposed.lossy).toBe(false);
    expect(decomposed.selectedDirections).toEqual([]);
    expect(decomposed.brief).toBe(input.brief);
  });

  it("handles multi-paragraph brief without losing selectedDirections or requiredPoints", async () => {
    const { composeBriefDetail, decomposeBriefDetail } = await import("../campaign.schema");

    const input = {
      brief: "Paragraf 1: Halo kreator.\n\nParagraf 2: Tolong buat video yang ceria dan santai.\n\nParagraf 3: Pastikan ada unboxing di awal.",
      selectedDirections: ["Tampilkan produk", "Detail kemasan"],
      requiredPoints: "- Wajib: Produk terlihat jelas\n\n- Hindari: Sebut kompetitor",
      hashtags: "#KeripikTempe #Kuliner",
      location: "Bandung",
      assetNotes: "Gunakan logo versi transparan.",
    };

    const composed = composeBriefDetail(input);
    const decomposed = decomposeBriefDetail(composed);

    expect(decomposed.lossy).toBe(false);
    expect(decomposed.brief).toBe(input.brief);
    expect(decomposed.selectedDirections).toEqual(["Tampilkan produk", "Detail kemasan"]);
    expect(decomposed.requiredPoints).toBe(input.requiredPoints);
    expect(decomposed.hashtags).toBe(input.hashtags);
    expect(decomposed.location).toBe(input.location);
    expect(decomposed.assetNotes).toBe(input.assetNotes);
  });

  it("handles empty brief with only selectedDirections and requiredPoints", async () => {
    const { composeBriefDetail, decomposeBriefDetail } = await import("../campaign.schema");

    const input = {
      brief: "",
      selectedDirections: ["Tampilkan produk"],
      requiredPoints: "- Wajib: Poin satu",
    };

    const composed = composeBriefDetail(input);
    const decomposed = decomposeBriefDetail(composed);

    expect(decomposed.lossy).toBe(false);
    expect(decomposed.brief).toBe("");
    expect(decomposed.selectedDirections).toEqual(["Tampilkan produk"]);
    expect(decomposed.requiredPoints).toBe("- Wajib: Poin satu");
  });
});

describe("parseRequiredPoints & formatCombinedRequiredPoints", () => {
  it("bidirectionally parses guidelines and preserves custom rules", async () => {
    const { parseRequiredPoints, formatCombinedRequiredPoints } = await import(
      "@/components/features/umkm-dashboard/create-campaign/create-campaign.utils"
    );

    const rawInput = [
      "- Wajib: Produk terlihat jelas",
      "- Wajib: Kemasan produk",
      "- Hindari: Sebut kompetitor",
      "- Hindari: Klaim berlebihan",
      "Jangan tampilkan area dapur produksi",
      "Pastikan pencahayaan cukup terang",
    ].join("\n");

    const parsed = parseRequiredPoints(rawInput);
    expect(parsed.selectedReqGuidelines).toEqual(["Produk terlihat jelas", "Kemasan produk"]);
    expect(parsed.selectedRestGuidelines).toEqual(["Sebut kompetitor", "Klaim berlebihan"]);
    expect(parsed.customRequiredPoints).toContain("Jangan tampilkan area dapur produksi");
    expect(parsed.customRequiredPoints).toContain("Pastikan pencahayaan cukup terang");

    const reformatted = formatCombinedRequiredPoints(
      parsed.selectedReqGuidelines,
      parsed.selectedRestGuidelines,
      parsed.customRequiredPoints
    );

    const reparsed = parseRequiredPoints(reformatted);
    expect(reparsed.selectedReqGuidelines).toEqual(parsed.selectedReqGuidelines);
    expect(reparsed.selectedRestGuidelines).toEqual(parsed.selectedRestGuidelines);
    expect(reparsed.customRequiredPoints).toEqual(parsed.customRequiredPoints);
  });

  it("handles empty or whitespace raw input gracefully", async () => {
    const { parseRequiredPoints } = await import(
      "@/components/features/umkm-dashboard/create-campaign/create-campaign.utils"
    );

    const parsed = parseRequiredPoints("");
    expect(parsed.selectedReqGuidelines).toEqual([]);
    expect(parsed.selectedRestGuidelines).toEqual([]);
    expect(parsed.customRequiredPoints).toBe("");
  });
});


describe("campaignStepSchemas[1] thumbnailUrl", () => {
  const schema = campaignStepSchemas[1];
  const base = {
    title: "Kopi susu gula aren",
    category: "kuliner",
    type: "ugc" as const,
    description: "Deskripsi produk campaign yang cukup panjang untuk lolos validasi.",
  };
  const validUrl =
    "https://api.example.test/v1/storage/buckets/campaign-assets/files/abc123XYZ_-1/view";

  it("passes with valid Appwrite campaign-assets URL", () => {
    const result = schema.safeParse({ ...base, thumbnailUrl: validUrl });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.thumbnailUrl).toBe(validUrl);
  });

  it("trims surrounding whitespace", () => {
    const result = schema.safeParse({ ...base, thumbnailUrl: `  ${validUrl}  ` });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.thumbnailUrl).toBe(validUrl);
  });

  it("fails when thumbnailUrl is missing", () => {
    const result = schema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.flatten().fieldErrors.thumbnailUrl;
      expect(error).toContain("Gambar produk campaign wajib diunggah.");
    }
  });

  it("fails when thumbnailUrl is empty or whitespace", () => {
    for (const thumbnailUrl of ["", "   "]) {
      const result = schema.safeParse({ ...base, thumbnailUrl });
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.flatten().fieldErrors.thumbnailUrl;
        expect(error).toContain("Gambar produk campaign wajib diunggah.");
      }
    }
  });

  it("fails when thumbnailUrl exceeds 2048 characters", () => {
    const tooLong = `https://api.example.test/${"a".repeat(2100)}`;
    const result = schema.safeParse({ ...base, thumbnailUrl: tooLong });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.flatten().fieldErrors.thumbnailUrl;
      expect(error).toContain("URL gambar produk maksimal 2048 karakter.");
    }
  });
});

describe("legacyEditStep1Schema (campaign legacy tanpa thumbnail)", () => {
  const schema = legacyEditStep1Schema;
  const base = {
    title: "Kopi susu gula aren",
    category: "kuliner",
    type: "ugc" as const,
    description: "Deskripsi produk campaign yang cukup panjang untuk lolos validasi.",
  };

  it("passes with empty thumbnailUrl (legacy campaign stays valid)", () => {
    expect(schema.safeParse({ ...base, thumbnailUrl: "" }).success).toBe(true);
  });

  it("passes when legacy campaign adds a thumbnail", () => {
    const thumbnailUrl =
      "https://api.example.test/v1/storage/buckets/campaign-assets/files/abc1/view";
    const result = schema.safeParse({ ...base, thumbnailUrl });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.thumbnailUrl).toBe(thumbnailUrl);
  });

  it("still enforces 2048 max when a thumbnail is present", () => {
    const result = schema.safeParse({ ...base, thumbnailUrl: `https://x.test/${"a".repeat(2100)}` });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.flatten().fieldErrors.thumbnailUrl;
      expect(error).toContain("URL gambar produk maksimal 2048 karakter.");
    }
  });

  it("still enforces other required step-1 fields", () => {
    const result = schema.safeParse({ ...base, title: "", thumbnailUrl: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.flatten().fieldErrors.title;
      expect(error).toContain("Judul campaign wajib diisi.");
    }
  });
});
