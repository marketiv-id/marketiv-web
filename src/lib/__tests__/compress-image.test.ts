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
