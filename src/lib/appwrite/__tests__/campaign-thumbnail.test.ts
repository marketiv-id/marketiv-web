import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../config", () => ({
  appwriteConfig: {
    endpoint: "https://api.example.test/v1",
    projectId: "proj-test",
    databaseId: "db-test",
    storageBucketId: "user-files",
    buckets: {
      avatars: "avatars",
      creatorBanners: "creator-banners",
      logos: "logos",
      portfolios: "portfolios",
      campaignAssets: "campaign-assets",
      deliverables: "deliverables",
      fraudEvidence: "fraud-evidence",
      userFiles: "user-files",
    },
  },
}));

import {
  assertCampaignThumbnailFile,
  parseCampaignThumbnailFileId,
  deleteCampaignThumbnailByUrl,
  copyCampaignThumbnail,
  FileRuleError,
} from "../campaign-thumbnail";

const VALID_URL =
  "https://api.example.test/v1/storage/buckets/campaign-assets/files/abc123XYZ_-1/view?project=proj-test";

describe("parseCampaignThumbnailFileId", () => {
  it("parses fileId from valid campaign-assets view URL", () => {
    expect(parseCampaignThumbnailFileId(VALID_URL)).toBe("abc123XYZ_-1");
  });

  it("parses URL without query string", () => {
    expect(
      parseCampaignThumbnailFileId(
        "https://api.example.test/v1/storage/buckets/campaign-assets/files/file001/view"
      )
    ).toBe("file001");
  });

  it("rejects empty and malformed input", () => {
    expect(parseCampaignThumbnailFileId("")).toBeNull();
    expect(parseCampaignThumbnailFileId("not-a-url")).toBeNull();
    expect(parseCampaignThumbnailFileId("storage/buckets/campaign-assets/files/x/view")).toBeNull();
  });

  it("rejects different bucket", () => {
    expect(
      parseCampaignThumbnailFileId(
        "https://api.example.test/v1/storage/buckets/avatars/files/abc123/view"
      )
    ).toBeNull();
  });

  it("rejects different origin", () => {
    expect(
      parseCampaignThumbnailFileId(
        "https://evil.example/v1/storage/buckets/campaign-assets/files/abc123/view"
      )
    ).toBeNull();
  });

  it("rejects non-https protocols", () => {
    expect(
      parseCampaignThumbnailFileId(
        "ftp://api.example.test/v1/storage/buckets/campaign-assets/files/abc123/view"
      )
    ).toBeNull();
  });

  it("rejects non-view paths", () => {
    expect(
      parseCampaignThumbnailFileId(
        "https://api.example.test/v1/storage/buckets/campaign-assets/files/abc123/download"
      )
    ).toBeNull();
    expect(
      parseCampaignThumbnailFileId(
        "https://api.example.test/v1/storage/buckets/campaign-assets"
      )
    ).toBeNull();
  });

  it("rejects paths outside the endpoint base path", () => {
    expect(
      parseCampaignThumbnailFileId(
        "https://api.example.test/other/storage/buckets/campaign-assets/files/abc123/view"
      )
    ).toBeNull();
  });

  it("rejects path traversal in fileId", () => {
    expect(
      parseCampaignThumbnailFileId(
        "https://api.example.test/v1/storage/buckets/campaign-assets/files/../secrets/view"
      )
    ).toBeNull();
  });

  it("rejects fileId that does not start with alphanumeric", () => {
    expect(
      parseCampaignThumbnailFileId(
        "https://api.example.test/v1/storage/buckets/campaign-assets/files/-abc123/view"
      )
    ).toBeNull();
  });
});

describe("assertCampaignThumbnailFile", () => {
  it("accepts image files within bucket rules", () => {
    const file = new File(["x"], "produk.jpg", { type: "image/jpeg" });
    expect(() => assertCampaignThumbnailFile(file)).not.toThrow();
  });

  it("rejects non-image MIME types", () => {
    const file = new File(["x"], "dokumen.pdf", { type: "application/pdf" });
    expect(() => assertCampaignThumbnailFile(file)).toThrow(FileRuleError);
    expect(() => assertCampaignThumbnailFile(file)).toThrow(
      "File harus berupa gambar (JPG, PNG, WebP, atau GIF)."
    );
  });

  it("rejects files without MIME type", () => {
    const file = new File(["x"], "tanpa-tipe");
    expect(() => assertCampaignThumbnailFile(file)).toThrow(FileRuleError);
  });
});

describe("deleteCampaignThumbnailByUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false without touching storage for unrecognized URLs", async () => {
    const deleteSpy = vi.fn();
    vi.stubGlobal("fetch", deleteSpy);
    await expect(deleteCampaignThumbnailByUrl("https://evil.example/x")).resolves.toBe(false);
    await expect(deleteCampaignThumbnailByUrl("")).resolves.toBe(false);
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});

describe("copyCampaignThumbnail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws FileRuleError when source fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );
    await expect(copyCampaignThumbnail(VALID_URL, "u1")).rejects.toThrow(
      "Gagal membaca thumbnail sumber (HTTP 404)."
    );
  });

  it("throws FileRuleError when source is not an image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["plain"], { type: "text/plain" }),
      })
    );
    await expect(copyCampaignThumbnail(VALID_URL, "u1")).rejects.toThrow(
      "Thumbnail sumber bukan gambar."
    );
  });
});
