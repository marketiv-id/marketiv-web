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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Gambar ke canvas berskala → encode WebP. Loop kualitas dari 0.80 turun
 * per 0.1 sampai ≤ target ATAU floor 0.50. Dimensi tidak berubah antar iterasi.
 * @throws bila canvas gagal, encode gagal, atau output bukan WebP.
 */
async function encodeWebp(source: CanvasImageSource, target: TargetSize): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
  ctx.drawImage(source, 0, 0, target.width, target.height);

  let quality: number = IMAGE_COMPRESSION.quality;
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
    quality = Math.max(IMAGE_COMPRESSION.minQuality, Math.round((quality - 0.1) * 10) / 10);
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
