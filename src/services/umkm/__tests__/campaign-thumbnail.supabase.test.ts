import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Port test `src/lib/appwrite/__tests__/campaign-thumbnail.test.ts` ke versi
 * Supabase (`src/lib/supabase/campaign-thumbnail.ts`). Ditaruh di sini karena
 * `src/lib/supabase/__tests__` belum masuk `include` vitest.
 */

const storage = vi.hoisted(() => ({
  remove: vi.fn(),
  copy: vi.fn(),
  upload: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: (bucket: string) => {
        storage.from(bucket);
        return {
          remove: storage.remove,
          copy: storage.copy,
          upload: storage.upload,
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://proj.supabase.test/storage/v1/object/public/${bucket}/${path}` },
          }),
        };
      },
    },
  }),
}));

import {
  assertCampaignThumbnailFile,
  copyCampaignThumbnail,
  deleteCampaignThumbnailByUrl,
  FileRuleError,
  parseCampaignThumbnailPath,
} from "@/lib/supabase/campaign-thumbnail";

const BASE = "https://proj.supabase.test";
const UID = "a1111111-1111-4111-8111-111111111111";
const VALID = `${BASE}/storage/v1/object/public/campaign-assets/${UID}/abc-123.png`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE);
  storage.remove.mockResolvedValue({ data: [], error: null });
  storage.copy.mockResolvedValue({ data: { path: "x" }, error: null });
  storage.upload.mockResolvedValue({ data: { path: "x" }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("parseCampaignThumbnailPath", () => {
  it("path dari URL publik campaign-assets project ini", () => {
    expect(parseCampaignThumbnailPath(VALID)).toBe(`${UID}/abc-123.png`);
  });

  it("gagal aman: kosong, rusak, bucket lain, host lain, URL Appwrite lama, traversal, sub-folder", () => {
    for (const url of [
      "",
      "not-a-url",
      `${BASE}/storage/v1/object/public/avatars/${UID}/a.png`,
      `https://evil.test/storage/v1/object/public/campaign-assets/${UID}/a.png`,
      "https://api.example.test/v1/storage/buckets/campaign-assets/files/abc/view",
      `${BASE}/storage/v1/object/public/campaign-assets/${UID}/../x.png`,
      `${BASE}/storage/v1/object/public/campaign-assets/${UID}/sub/a.png`,
      `${BASE}/storage/v1/object/public/campaign-assets/${UID}/-a.png`,
    ]) {
      expect(parseCampaignThumbnailPath(url)).toBeNull();
    }
  });
});

describe("assertCampaignThumbnailFile", () => {
  it("menerima gambar dalam batas bucket", () => {
    expect(() => assertCampaignThumbnailFile(new File(["x"], "produk.jpg", { type: "image/jpeg" }))).not.toThrow();
  });
  it("menolak non-gambar / tanpa MIME", () => {
    expect(() => assertCampaignThumbnailFile(new File(["x"], "d.pdf", { type: "application/pdf" }))).toThrow(
      "File harus berupa gambar (JPG, PNG, WebP, atau GIF).",
    );
    expect(() => assertCampaignThumbnailFile(new File(["x"], "tanpa-tipe"))).toThrow(FileRuleError);
  });
});

describe("deleteCampaignThumbnailByUrl", () => {
  it("URL tak dikenal → false tanpa menyentuh storage", async () => {
    await expect(deleteCampaignThumbnailByUrl("https://evil.example/x")).resolves.toBe(false);
    await expect(deleteCampaignThumbnailByUrl("")).resolves.toBe(false);
    expect(storage.remove).not.toHaveBeenCalled();
  });
  it("URL valid → remove path di campaign-assets", async () => {
    await expect(deleteCampaignThumbnailByUrl(VALID)).resolves.toBe(true);
    expect(storage.from).toHaveBeenCalledWith("campaign-assets");
    expect(storage.remove).toHaveBeenCalledWith([`${UID}/abc-123.png`]);
  });
});

describe("copyCampaignThumbnail", () => {
  it("sumber milik sendiri → storage.copy ke path baru di folder sendiri", async () => {
    const copied = await copyCampaignThumbnail(VALID, UID);
    const [from, to] = storage.copy.mock.calls[0] as [string, string];
    expect(from).toBe(`${UID}/abc-123.png`);
    expect(to).toMatch(new RegExp(`^${UID}/[^/]+\\.png$`));
    expect(to).not.toBe(from);
    expect(copied.url).toBe(`${BASE}/storage/v1/object/public/campaign-assets/${to}`);
  });

  it("sumber lain (Appwrite lama) → unduh lalu unggah; fetch gagal → FileRuleError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(copyCampaignThumbnail("https://api.example.test/v1/x.png", UID)).rejects.toThrow(
      "Gagal membaca thumbnail sumber (HTTP 404).",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["plain"], { type: "text/plain" }) }),
    );
    await expect(copyCampaignThumbnail("https://api.example.test/v1/x.png", UID)).rejects.toThrow(
      "Thumbnail sumber bukan gambar.",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["img"], { type: "image/png" }) }),
    );
    const uploaded = await copyCampaignThumbnail("https://api.example.test/v1/x.png", UID);
    expect(storage.upload).toHaveBeenCalledTimes(1);
    expect(uploaded.fileId).toMatch(new RegExp(`^${UID}/[^/]+\\.png$`));
  });
});
