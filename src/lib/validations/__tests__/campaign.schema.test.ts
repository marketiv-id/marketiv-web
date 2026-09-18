import { describe, it, expect } from "vitest";
import {
  isCloudStorageFolderUrl,
  campaignStepSchemas,
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

