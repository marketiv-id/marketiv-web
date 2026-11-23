/**
 * Supabase Storage untuk bucket PUBLIK (pengganti `src/lib/appwrite/storage.ts`).
 *
 * API sengaja sama dengan versi Appwrite (`uploadPublicFile`, `deletePublicFile`,
 * `publicFileUrl`, `assertFileAllowed`, `BUCKET_RULES`, `FileRuleError`) supaya
 * service cukup mengganti import. Perbedaan: `fileId` sekarang = PATH objek di
 * bucket (`<uid>/<uuid>.<ext>`), bukan ID dokumen Appwrite.
 *
 * Upload publik langsung dari browser ke folder milik sendiri. Ini aman karena:
 *   - policy `public_buckets_*_own_folder` (0012) hanya mengizinkan path
 *     `<auth.uid()>/<file>` (tepat satu folder);
 *   - bucket menegakkan `file_size_limit` + `allowed_mime_types` di server.
 * Validasi di bawah hanya untuk pesan error yang jelas sebelum request.
 *
 * File PRIVAT (`user-files`, kuota) TIDAK lewat sini — pakai
 * `uploadUserFile*` (signed upload URL dari `/api/files/upload-url`).
 */
import { createClient } from "./client";

export type PublicBucket = "avatars" | "creatorBanners" | "logos" | "portfolios" | "campaignAssets";

/** ID bucket Supabase (0012_storage.sql). */
export const BUCKET_IDS: Record<PublicBucket, string> = {
  avatars: "avatars",
  creatorBanners: "creator-banners",
  logos: "logos",
  portfolios: "portfolios",
  campaignAssets: "campaign-assets",
};

/** `extensions: []` berarti semua ekstensi diperbolehkan (campaign-assets). */
export const BUCKET_RULES: Record<PublicBucket, { maxBytes: number; extensions: string[] }> = {
  avatars: { maxBytes: 5_000_000, extensions: ["jpg", "jpeg", "png", "webp"] },
  creatorBanners: { maxBytes: 5_000_000, extensions: ["jpg", "jpeg", "png", "webp"] },
  logos: { maxBytes: 5_000_000, extensions: ["jpg", "jpeg", "png", "webp"] },
  portfolios: { maxBytes: 50_000_000, extensions: ["jpg", "jpeg", "png", "webp", "pdf", "mp4"] },
  campaignAssets: { maxBytes: 50_000_000, extensions: [] },
};

export type UploadedFile = {
  /** Path objek di bucket — dipakai untuk menghapus. */
  fileId: string;
  bucketId: string;
  url: string;
  name: string;
  sizeBytes: number;
};

/** Pelanggaran aturan bucket, dilempar SEBELUM request. Pesan Indonesia. */
export class FileRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileRuleError";
  }
}

const fileExtension = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
};

const formatMb = (bytes: number): string =>
  `${(bytes / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} MB`;

/** Validasi ukuran & ekstensi terhadap aturan bucket. @throws FileRuleError */
export function assertFileAllowed(target: PublicBucket, file: File): void {
  const rules = BUCKET_RULES[target];
  if (file.size > rules.maxBytes) {
    throw new FileRuleError(`Ukuran file melebihi batas ${formatMb(rules.maxBytes)}.`);
  }
  if (rules.extensions.length > 0) {
    const ext = fileExtension(file.name);
    if (!rules.extensions.includes(ext)) {
      throw new FileRuleError(`Format file tidak didukung. Gunakan: ${rules.extensions.join(", ")}.`);
    }
  }
}

/** URL publik untuk objek di bucket publik. */
export function publicFileUrl(bucketId: string, path: string): string {
  return createClient().storage.from(bucketId).getPublicUrl(path).data.publicUrl;
}

const PUBLIC_PATH = /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
const PUBLIC_BUCKET_IDS = new Set(Object.values(BUCKET_IDS));

/**
 * Parse `{ bucketId, path }` dari URL publik Supabase milik project ini.
 * GAGAL AMAN (`null`) bila host, bucket, atau bentuk path tidak cocok —
 * supaya penghapusan tidak pernah menyentuh objek arbitrer dari URL tak
 * terpercaya. (Policy storage tetap membatasi ke folder sendiri.)
 */
export function parsePublicFileUrl(url: string): { bucketId: string; path: string } | null {
  if (!url || typeof url !== "string") return null;
  let parsed: URL;
  let base: URL;
  try {
    parsed = new URL(url);
    base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  } catch {
    return null;
  }
  if (parsed.origin !== base.origin) return null;
  const match = PUBLIC_PATH.exec(parsed.pathname);
  if (!match) return null;
  const bucketId = decodeURIComponent(match[1]);
  const path = decodeURIComponent(match[2]);
  if (!PUBLIC_BUCKET_IDS.has(bucketId)) return null;
  if (path.includes("..") || path.split("/").length !== 2) return null;
  return { bucketId, path };
}

function randomName(file: File): string {
  const ext = fileExtension(file.name);
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return ext ? `${id}.${ext}` : id;
}

/**
 * Unggah file ke bucket publik di folder `<ownerUserId>/` lalu kembalikan URL publiknya.
 * @throws FileRuleError bila melanggar aturan bucket; error Storage bila upload gagal.
 */
export async function uploadPublicFile(
  target: PublicBucket,
  file: File,
  ownerUserId: string,
): Promise<UploadedFile> {
  assertFileAllowed(target, file);
  if (!ownerUserId) throw new FileRuleError("Sesi tidak ditemukan. Silakan login.");
  const bucketId = BUCKET_IDS[target];
  const path = `${ownerUserId}/${randomName(file)}`;
  const { error } = await createClient()
    .storage.from(bucketId)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return { fileId: path, bucketId, url: publicFileUrl(bucketId, path), name: file.name, sizeBytes: file.size };
}

/** Hapus objek di bucket publik (policy: hanya folder milik sendiri). */
export async function deletePublicFile(bucketId: string, path: string): Promise<void> {
  const { error } = await createClient().storage.from(bucketId).remove([path]);
  if (error) throw error;
}
