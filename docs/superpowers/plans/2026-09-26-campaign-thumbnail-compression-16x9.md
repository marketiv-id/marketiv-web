# Campaign Thumbnail Compression + 16:9 Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress campaign thumbnails to WebP (max 1600px, q0.80, target ≤500KB) before Appwrite upload, and render all campaign thumbnail containers as responsive 16:9 `aspect-video` with `object-cover`.

**Architecture:** New browser-native utility `src/lib/compress-image.ts` (createImageBitmap + canvas.toBlob, no new dependency). `CreateCampaignWizard.handleSelectThumbnail` validates → compresses → previews optimized file → uploads. Presentation = container-class-only edits at 8 render sites; Model B lifecycle code untouched.

**Tech Stack:** TypeScript, React 19, Next 16, Tailwind v4 (`aspect-video`), Vitest + jsdom, canvas browser APIs.

## Global Constraints

- No new npm dependency.
- No Appwrite schema change; `campaigns.thumbnailUrl` field stays.
- Compression output: `image/webp`, longest side ≤ 1600px, never upscale, starting quality 0.80, 500 KB = TARGET not hard limit (quality loop floor 0.50, dimensions never cut).
- Preserve original aspect ratio during compression; NEVER crop stored file to 16:9.
- WebP encode failure OR decode failure → throw clear Indonesian error → toast → NO upload of original file (user-approved amendment).
- Model B lifecycle (`CreateCampaignWizard.tsx` lines 162-172, 181-205, 478-496) must remain byte-identical in behavior.
- Validation not weakened: pre-compress `assertCampaignThumbnailFile` + unchanged upload-path validation.
- Presentation: `aspect-video` + `object-cover`, no fixed pixel heights as primary sizing, badges/fallbacks preserved.
- Legacy campaigns with `thumbnailUrl = ""` remain valid; existing tests must stay green.
- Do NOT commit (user has not requested commits).

---

### Task 1: Compression utility (TDD)

**Files:**
- Create: `src/lib/compress-image.ts`
- Test: `src/lib/__tests__/compress-image.test.ts`

**Interfaces:**
- Produces: `IMAGE_COMPRESSION: { maxDimension: 1600; quality: 0.8; targetBytes: 500_000; minQuality: 0.5 }`, `computeTargetSize(width: number, height: number, maxDimension?: number): { width: number; height: number }`, `compressImageToWebP(file: File): Promise<File>`
- Consumed later by Task 2 wizard code.

- [x] **Step 1: Write failing tests**

Create `src/lib/__tests__/compress-image.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  compressImageToWebP,
  computeTargetSize,
  IMAGE_COMPRESSION,
} from "../compress-image";

const bytes = (n: number) => new Uint8Array(n);

const sourceFile = (name: string, type: string, size = 2_000_000) =>
  new File([bytes(size)], name, { type });

/** Stub decode via createImageBitmap; returns the spy for assertions. */
const stubDecode = (width: number, height: number) => {
  const close = vi.fn();
  const spy = vi.fn(async () => ({ width, height, close }));
  vi.stubGlobal("createImageBitmap", spy);
  return { spy, close };
};

/** Stub canvas: capture drawImage args, encode via callback. */
const stubCanvas = (encode: (quality: number) => Blob) => {
  const drawImage = vi.fn();
  const toBlobCalls: number[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
    _type?: string,
    quality?: number
  ) {
    const q = quality ?? 1;
    toBlobCalls.push(q);
    cb(encode(q));
  });
  return { drawImage, toBlobCalls };
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("computeTargetSize", () => {
  it("downscales large landscape to 1600 longest side", () => {
    expect(computeTargetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
  });

  it("downscales large portrait to 1600 longest side", () => {
    expect(computeTargetSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it("downscales square to 1600x1600", () => {
    expect(computeTargetSize(3000, 3000)).toEqual({ width: 1600, height: 1600 });
  });

  it("never upscales an already-small image", () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("keeps images exactly at the limit unchanged", () => {
    expect(computeTargetSize(1600, 900)).toEqual({ width: 1600, height: 900 });
  });

  it("rejects non-positive dimensions", () => {
    expect(() => computeTargetSize(0, 100)).toThrow();
  });
});

describe("compressImageToWebP", () => {
  it("compresses large landscape to 1600x1200 WebP smaller than original", async () => {
    stubDecode(4000, 3000);
    const { drawImage } = stubCanvas(() => new Blob([bytes(150_000)], { type: "image/webp" }));

    const result = await compressImageToWebP(sourceFile("foto.jpg", "image/jpeg"));

    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage.mock.calls[0][1]).toBe(0);
    expect(drawImage.mock.calls[0][2]).toBe(0);
    expect(drawImage.mock.calls[0][3]).toBe(1600);
    expect(drawImage.mock.calls[0][4]).toBe(1200);
    expect(result.type).toBe("image/webp");
    expect(result.name).toBe("foto.webp");
    expect(result.size).toBeLessThan(2_000_000);
  });

  it("compresses large portrait to 1200x1600 preserving ratio", async () => {
    stubDecode(3000, 4000);
    const { drawImage } = stubCanvas(() => new Blob([bytes(120_000)], { type: "image/webp" }));

    const result = await compressImageToWebP(sourceFile("gaya.png", "image/png"));

    expect(drawImage.mock.calls[0][3]).toBe(1200);
    expect(drawImage.mock.calls[0][4]).toBe(1600);
    expect(result.type).toBe("image/webp");
  });

  it("compresses square source to 1600x1600 (no crop to 16:9)", async () => {
    stubDecode(3000, 3000);
    const { drawImage } = stubCanvas(() => new Blob([bytes(140_000)], { type: "image/webp" }));

    await compressImageToWebP(sourceFile("kotak.jpg", "image/jpeg"));

    expect(drawImage.mock.calls[0][3]).toBe(1600);
    expect(drawImage.mock.calls[0][4]).toBe(1600);
  });

  it("does not upscale an already-small image", async () => {
    stubDecode(800, 600);
    const { drawImage } = stubCanvas(() => new Blob([bytes(40_000)], { type: "image/webp" }));

    await compressImageToWebP(sourceFile("kecil.jpg", "image/jpeg"));

    expect(drawImage.mock.calls[0][3]).toBe(800);
    expect(drawImage.mock.calls[0][4]).toBe(600);
  });

  it("rejects a non-image source file before processing", async () => {
    await expect(
      compressImageToWebP(sourceFile("dokumen.txt", "text/plain"))
    ).rejects.toThrow(/gambar/i);
  });

  it("starts at quality 0.80 and only recompresses when above target", async () => {
    stubDecode(2000, 1500);
    const { toBlobCalls } = stubCanvas(
      (q) =>
        new Blob([bytes(q >= 0.8 ? 800_000 : 300_000)], {
          type: "image/webp",
        })
    );

    const result = await compressImageToWebP(sourceFile("besar.jpg", "image/jpeg"));

    expect(toBlobCalls).toEqual([0.8, 0.7]);
    expect(result.size).toBe(300_000);
  });

  it("stops at minQuality floor instead of looping forever", async () => {
    stubDecode(2000, 1500);
    const { toBlobCalls } = stubCanvas(() => new Blob([bytes(600_000)], { type: "image/webp" }));

    const result = await compressImageToWebP(sourceFile("besar.jpg", "image/jpeg"));

    expect(toBlobCalls).toEqual([0.8, 0.7, 0.6, 0.5]);
    expect(result.size).toBe(600_000);
  });

  it("fails loudly when the browser cannot encode WebP (no original fallback)", async () => {
    stubDecode(2000, 1500);
    stubCanvas(() => new Blob([bytes(50_000)], { type: "image/png" }));

    await expect(
      compressImageToWebP(sourceFile("foto.jpg", "image/jpeg"))
    ).rejects.toThrow(/WebP/i);
  });

  it("fails when decode fails", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("decode error");
      })
    );

    await expect(
      compressImageToWebP(sourceFile("rusak.jpg", "image/jpeg"))
    ).rejects.toThrow();
  });

  it("exposes spec constants", () => {
    expect(IMAGE_COMPRESSION.maxDimension).toBe(1600);
    expect(IMAGE_COMPRESSION.quality).toBe(0.8);
    expect(IMAGE_COMPRESSION.targetBytes).toBe(500_000);
    expect(IMAGE_COMPRESSION.minQuality).toBe(0.5);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/compress-image.test.ts`
Expected: FAIL — `Failed to resolve import "../compress-image"`.

- [x] **Step 3: Write minimal implementation**

Create `src/lib/compress-image.ts`:

```ts
/**
 * Kompresi gambar di browser SEBELUM unggah ke Appwrite (campaign thumbnail).
 *
 * Browser-native: createImageBitmap + <canvas>.toBlob("image/webp") — tanpa
 * dependensi berat. Kebijakan:
 * - output WebP, sisi terpanjang ≤ 1600px, TIDAK pernah upscale
 * - rasio asli dipertahankan (TIDAK crop ke 16:9 — crop terjadi hanya saat render)
 * - kualitas mulai 0.80; 500 KB TARGET, bukan hard limit (floor kualitas 0.50,
 *   dimensi tidak pernah diturunkan untuk memaksa target)
 * - decode gagal / browser tidak bisa encode WebP → LEMPAR error.
 *   Tidak ada fallback diam-diam ke file asli — thumbnail wajib terkompresi.
 */

export const IMAGE_COMPRESSION = {
  maxDimension: 1600,
  quality: 0.8,
  targetBytes: 500_000,
  minQuality: 0.5,
} as const;

export type TargetSize = { width: number; height: number };

/**
 * Skala turun agar sisi terpanjang ≤ maxDimension. Tidak pernah upscale,
 * rasio asli dipertahankan.
 * @throws bila dimensi sumber tidak positif.
 */
export function computeTargetSize(
  width: number,
  height: number,
  maxDimension: number = IMAGE_COMPRESSION.maxDimension
): TargetSize {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Ukuran gambar tidak valid.");
  }
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

/** Decode file → sumber gambar + dimensi asli. Gagal → lempar error. */
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      throw new Error("Gagal membaca gambar. Pastikan file tidak rusak dan formatnya didukung.");
    }
  }
  // Fallback lingkungan tanpa createImageBitmap: <img> + object URL.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Gagal membaca gambar. Pastikan file tidak rusak dan formatnya didukung.");
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Gambar ke canvas berskala → encode WebP. Loop kualitas dari 0.80 turun
 * per 0.1 sampai ≤ target ATAU floor 0.50. Dimensi tidak berubah antar iterasi.
 * @throws bila canvas gagal, encode gagal, atau output bukan WebP.
 */
async function encodeWebp(
  source: CanvasImageSource,
  target: TargetSize
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
  ctx.drawImage(source, 0, 0, target.width, target.height);

  let quality = IMAGE_COMPRESSION.quality;
  for (;;) {
    const blob = await canvasToBlob(canvas, "image/webp", quality);
    if (!blob) throw new Error("Gagal memproses gambar. Coba lagi.");
    if (blob.type !== "image/webp") {
      throw new Error(
        "Browser ini tidak mendukung kompresi WebP. Perbarui browser untuk mengunggah gambar produk."
      );
    }
    if (blob.size <= IMAGE_COMPRESSION.targetBytes || quality <= IMAGE_COMPRESSION.minQuality) {
      return blob;
    }
    quality = Math.max(
      IMAGE_COMPRESSION.minQuality,
      Math.round((quality - 0.1) * 10) / 10
    );
  }
}

/**
 * Kompresi file gambar → File WebP baru (≤1600px, rasio asli, q mulai 0.80).
 * File asli TIDAK pernah dikirim balik — kegagalan = throw.
 * @throws bila sumber bukan gambar, decode gagal, atau encode WebP gagal.
 */
export async function compressImageToWebP(file: File): Promise<File> {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar (JPG, PNG, WebP, atau GIF).");
  }
  const decoded = await decodeImage(file);
  try {
    const target = computeTargetSize(decoded.width, decoded.height);
    const blob = await encodeWebp(decoded.source, target);
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    decoded.release();
  }
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/compress-image.test.ts`
Expected: PASS (all cases in Step 1).

- [x] **Step 5: Run lint on new files**

Run: `npm run lint`
Expected: no new errors from `src/lib/compress-image.ts` or its test.

---

### Task 2: Wizard validate → compress → preview → upload

**Files:**
- Modify: `src/components/features/umkm-dashboard/create-campaign/CreateCampaignWizard.tsx` (imports block ~line 30-43; `handleSelectThumbnail` lines 141-174)

**Interfaces:**
- Consumes: `compressImageToWebP(file: File): Promise<File>` (Task 1), `assertCampaignThumbnailFile(file: File): void` from `@/lib/appwrite/campaign-thumbnail` (existing).
- Produces: unchanged external behavior — `handleSelectThumbnail(file: File)` signature and props passed to `ProductInfoStep` / `CampaignLivePreviewCard` stay identical.

- [x] **Step 1: Add imports**

In `CreateCampaignWizard.tsx`, after the existing service import block (line 38, the `} from "@/services/umkm/umkm-dashboard.service";` line), add:

```ts
import { assertCampaignThumbnailFile } from "@/lib/appwrite/campaign-thumbnail";
import { compressImageToWebP } from "@/lib/compress-image";
```

- [x] **Step 2: Replace `handleSelectThumbnail`**

Replace the whole function (current lines 141-174, including its JSDoc) with:

```ts
  /**
   * Pilih thumbnail → validasi sumber → KOMPRES dulu (WebP ≤1600px) →
   * pratinjau memakai file hasil kompresi (bytes yang benar-benar akan
   * disimpan) → unggah file hasil kompresi ke `campaign-assets`.
   * Urutan Model B TIDAK berubah: file BARU diunggah dulu; file lama hanya
   * dihapus setelah persistensi berhasil.
   */
  const handleSelectThumbnail = async (file: File) => {
    if (uploadingThumbnailRef.current) {
      toast.warning("Gambar lain sedang diproses. Tunggu sebentar.");
      return;
    }
    // Tolak file invalid SEBELUM kompresi/upload — validasi tidak dilewati.
    try {
      assertCampaignThumbnailFile(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "File gambar tidak valid.");
      return;
    }
    const previousStaged = thumbnailUrlRef.current;
    uploadingThumbnailRef.current = true;
    setIsUploadingThumbnail(true);
    let preview = "";
    try {
      let optimized: File;
      try {
        optimized = await compressImageToWebP(file);
      } catch (err) {
        // Decode/encode gagal → TIDAK upload file asli (thumbnail wajib terkompresi).
        toast.error(
          err instanceof Error ? err.message : "Gagal memproses gambar. Coba gambar lain."
        );
        return;
      }
      preview = URL.createObjectURL(optimized);
      setThumbnailPreview(preview);
      const res = await uploadCampaignThumbnail(optimized);
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Gagal mengunggah gambar produk. Coba lagi.");
        return;
      }
      // Unggah baru sukses → staged lama yang belum pernah tersimpan dibuang
      // supaya replace sebelum save tidak menumpuk file yatim.
      if (previousStaged && previousStaged !== persistedThumbnailUrlRef.current) {
        void deleteCampaignThumbnail(previousStaged);
      }
      setThumbnailUrl(res.data);
    } finally {
      if (preview) URL.revokeObjectURL(preview);
      setThumbnailPreview("");
      uploadingThumbnailRef.current = false;
      setIsUploadingThumbnail(false);
    }
  };
```

Notes for implementer:
- Do NOT touch: unmount cleanup effect (lines 181-191), `discardStagedThumbnail` (194-205), `saveDraft` Model B block (478-496), `handleResetWizard`.
- `previousStaged` read before compression (guarded: no concurrent mutation while `uploadingThumbnailRef` is set).
- Object URL: exactly one transient URL per selection, revoked in `finally`; `thumbnailPreviewRef` cleanup paths unchanged.

- [x] **Step 3: Run existing create-campaign regression tests**

Run: `npx vitest run src/components/features/umkm-dashboard/create-campaign src/services/umkm/__tests__/umkm-dashboard.thumbnail-legacy.test.ts src/lib/appwrite/__tests__/campaign-thumbnail.test.ts`
Expected: PASS — no lifecycle/validation test changes.

- [x] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

---

### Task 3: 16:9 presentation (8 sites) + presentation test

**Files:**
- Modify: `src/components/features/umkm-dashboard/campaign/CampaignCard.tsx:104`
- Modify: `src/components/features/umkm-dashboard/overview/CampaignSection.tsx:82-87`
- Modify: `src/components/features/umkm-dashboard/campaign/CampaignTable.tsx:101-108`
- Modify: `src/components/features/umkm-dashboard/create-campaign/steps/ProductInfoStep.tsx:104`
- Modify: `src/components/features/umkm-dashboard/create-campaign/CampaignLivePreviewCard.tsx:61-63`
- Modify: `src/components/features/creator-dashboard/JobPoolView.tsx:113-114`
- Modify: `src/components/features/creator-dashboard/CreatorDashboardView.tsx:183`
- Modify: `src/components/features/creator-dashboard/PekerjaanAktifView.tsx:200-201`
- Test: `src/components/features/umkm-dashboard/campaign/__tests__/CampaignCard.responsive.test.tsx` (add case)

**Interfaces:**
- Consumes: nothing new. Produces: nothing — presentation only.

- [x] **Step 1: UMKM CampaignCard cover**

Line 104, replace:
```tsx
      <div className="relative h-32 sm:h-36 w-full overflow-hidden shrink-0" style={{ background: coverGradient }}>
```
with:
```tsx
      <div className="relative aspect-video w-full overflow-hidden shrink-0" style={{ background: coverGradient }}>
```

- [x] **Step 2: Overview CampaignSection cover**

Lines 82-84, replace:
```tsx
      <div
        className="h-28 sm:h-36 relative overflow-hidden shrink-0 flex flex-col justify-between p-2.5 sm:p-3.5"
        style={{
```
with:
```tsx
      <div
        className="aspect-video relative overflow-hidden shrink-0 flex flex-col justify-between p-2.5 sm:p-3.5"
        style={{
```

- [x] **Step 3: CampaignTable thumbnail chip**

Lines 101-108, replace:
```tsx
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border-soft bg-neutral-100">
        {campaign.thumbnailUrl ? (
          <Image
            src={campaign.thumbnailUrl}
            alt={campaign.title}
            fill
            sizes="40px"
            className="object-cover"
```
with:
```tsx
      <div className="relative aspect-video w-14 shrink-0 overflow-hidden rounded-lg border border-border-soft bg-neutral-100">
        {campaign.thumbnailUrl ? (
          <Image
            src={campaign.thumbnailUrl}
            alt={campaign.title}
            fill
            sizes="56px"
            className="object-cover"
```
Then verify the thumbnail column definition in `CampaignTable.tsx` (search `renderThumbnail` usage / `<th>` widths) has no fixed width narrower than 56px; if a fixed width exists, widen it to fit `w-14`.

- [x] **Step 4: ProductInfoStep preview box**

Line 104, replace:
```tsx
          <div className="relative w-24 h-24 shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden flex items-center justify-center">
```
with:
```tsx
          <div className="relative w-24 aspect-video shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden flex items-center justify-center">
```

- [x] **Step 5: CampaignLivePreviewCard cover**

Lines 61-63, replace:
```tsx
      <div
        className="relative h-36 w-full flex items-center justify-center overflow-hidden group transition-all"
        style={{
```
with:
```tsx
      <div
        className="relative aspect-video w-full flex items-center justify-center overflow-hidden group transition-all"
        style={{
```
Keep the existing `background: ... center/cover` style unchanged.

- [x] **Step 6: JobPoolView card cover**

Lines 113-114, replace:
```tsx
      {/* Cover image — 4:3 aspect ratio */}
      <div className="relative w-full overflow-hidden bg-neutral-100" style={{ aspectRatio: "4/3" }}>
```
with:
```tsx
      {/* Cover image — 16:9 aspect ratio */}
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
```

- [x] **Step 7: CreatorDashboardView card cover**

Line 183, replace:
```tsx
      <div className="relative w-full overflow-hidden aspect-[16/10] sm:aspect-[4/3] bg-neutral-100 shrink-0">
```
with:
```tsx
      <div className="relative w-full overflow-hidden aspect-video bg-neutral-100 shrink-0">
```

- [x] **Step 8: PekerjaanAktifView card cover**

Lines 200-201, replace:
```tsx
      {/* Cover image — same 4:3 as Job Pool */}
      <div className="relative w-full overflow-hidden shrink-0 bg-neutral-100" style={{ aspectRatio: "4/3" }}>
```
with:
```tsx
      {/* Cover image — same 16:9 as Job Pool */}
      <div className="relative aspect-video w-full overflow-hidden shrink-0 bg-neutral-100">
```

- [x] **Step 9: Sweep for leftover ratio comments/references**

Run: `rg -n "4:3|4/3|16/10|16:10" src/components/features/creator-dashboard/JobPoolView.tsx src/components/features/creator-dashboard/PekerjaanAktifView.tsx src/components/features/creator-dashboard/CreatorDashboardView.tsx`
Fix any stale comments referring to the old cover ratio. Do NOT touch non-cover usages (avatars, unrelated layout).

- [x] **Step 10: Add presentation assertion to existing responsive test**

In `src/components/features/umkm-dashboard/campaign/__tests__/CampaignCard.responsive.test.tsx`, inside `describe("CampaignCard responsive layout")`, append:

```ts
  it("renders thumbnail cover as 16:9 aspect-video container", async () => {
    await act(async () => {
      root?.render(
        <CampaignCard
          campaign={{ ...baseCampaign, thumbnailUrl: "https://cdn.test/thumb.webp" }}
          pendingCount={0}
          validCount={0}
          onDuplicate={vi.fn()}
          onCancel={vi.fn()}
          onDelete={vi.fn()}
          onPublish={vi.fn()}
          onExport={vi.fn()}
          onEdit={vi.fn()}
        />
      );
    });

    const cover = host.querySelector("img")?.parentElement;
    expect(cover).not.toBeNull();
    expect(cover?.className).toContain("aspect-video");
    expect(cover?.className).toContain("overflow-hidden");
    expect(host.querySelector("img")?.className).toContain("object-cover");
  });

  it("renders fallback (no thumbnail) in the same 16:9 container", async () => {
    await act(async () => {
      root?.render(
        <CampaignCard
          campaign={baseCampaign}
          pendingCount={0}
          validCount={0}
          onDuplicate={vi.fn()}
          onCancel={vi.fn()}
          onDelete={vi.fn()}
          onPublish={vi.fn()}
          onExport={vi.fn()}
          onEdit={vi.fn()}
        />
      );
    });

    const img = host.querySelector("img");
    expect(img).toBeNull();
    expect(host.querySelector(".aspect-video")).not.toBeNull();
  });
```

- [x] **Step 11: Run presentation + full component tests**

Run: `npx vitest run src/components/features/umkm-dashboard/campaign`
Expected: PASS including the two new cases.

---

### Task 4: Full verification + report

**Files:** none modified.

- [x] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [x] **Step 2: Unit tests (full suite, single run)**

Run: `npx vitest run`
Expected: all pass, including new `compress-image.test.ts` and existing thumbnail lifecycle/validation tests.

- [x] **Step 3: Build**

Run: `npm run build`
Expected: compiled successfully.

- [x] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors.

- [x] **Step 5: Report**

Provide actual command results (pass/fail + counts), changed-file list, regression risks, manual E2E checklist for https://marketiv-dev.my.id (spec § Manual E2E). No deployment.

## Self-Review

- Spec coverage: compression util (T1), wizard flow (T2), 8 presentation sites + fallback/assertions (T3), verification (T4), WebP-fail = throw (T1 test + T2 comment), no-crop (T1 square test), Model B untouched (T2 notes), legacy tests green (T2 step 3 + T4 step 2). Covered.
- Placeholders: none; every step carries exact code or exact command.
- Type consistency: `compressImageToWebP(file: File): Promise<File>` identical in T1 interface block and T2 usage; `computeTargetSize` signature matches tests.
