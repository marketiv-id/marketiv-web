/**
 * Campaign Product Thumbnail — helper khusus campaign di atas storage.ts.
 *
 * Thumbnail = gambar produk utama campaign (campaigns.thumbnailUrl), bukan
 * logo UMKM, cover dekoratif, atau aset produksi (campaign_assets).
 *
 * Mekanika storage TETAP terpusat di storage.ts (uploadPublicFile /
 * deletePublicFile / publicFileUrl / assertFileAllowed). File ini hanya:
 * - validasi gambar sebelum unggah (campaign-assets mengizinkan semua
 *   ekstensi, jadi aturan MIME harus didefinisikan di sini — SATU tempat)
 * - mem-parse fileId dari URL view Appwrite secara ketat supaya penghapusan
 *   tidak pernah menyentuh fileId arbitrer dari URL tak terpercaya
 * - menyalin thumbnail sebagai file BARU saat duplikasi campaign
 */
import {
  uploadPublicFile,
  deletePublicFile,
  assertFileAllowed,
  FileRuleError,
  type UploadedFile,
} from "./storage";
import { appwriteConfig } from "./config";

export { FileRuleError };

/**
 * Validasi klien untuk thumbnail campaign: wajib gambar + aturan bucket.
 * `accept="image/*"` di input hanya petunjuk UX — MIME dicek di sini.
 * @throws FileRuleError bila bukan gambar atau melanggar aturan bucket.
 */
export function assertCampaignThumbnailFile(file: File): void {
  if (!file.type || !file.type.startsWith("image/")) {
    throw new FileRuleError("File harus berupa gambar (JPG, PNG, WebP, atau GIF).");
  }
  assertFileAllowed("campaignAssets", file);
}

/** Unggah thumbnail ke bucket `campaign-assets`, kembalikan hasil + URL publik. */
export async function uploadCampaignThumbnail(
  file: File,
  ownerUserId: string
): Promise<UploadedFile> {
  assertCampaignThumbnailFile(file);
  return uploadPublicFile("campaignAssets", file, ownerUserId);
}

const VIEW_PATH_REGEX = /^\/storage\/buckets\/([^/]+)\/files\/([^/]+)\/view$/;

/**
 * Parse fileId dari URL view Appwrite milik bucket campaign-assets.
 * GAGAL AMAN (null) bila host/endpoint, bucket, atau bentuk path tidak cocok —
 * memastikan kita tidak pernah menghapus fileId Appwrite lain.
 */
export function parseCampaignThumbnailFileId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  let pathname = parsed.pathname;
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  if (endpoint) {
    const expected = new URL(endpoint);
    if (parsed.origin !== expected.origin) return null;
    // publicFileUrl = `${endpoint}/storage/...` → pathname memuat base path
    // endpoint (mis. /v1). Cocokkan path SETELAH base path endpoint.
    const basePath = expected.pathname.replace(/\/+$/, "");
    if (basePath) {
      if (!pathname.startsWith(`${basePath}/`)) return null;
      pathname = pathname.slice(basePath.length);
    }
  }

  const match = pathname.match(VIEW_PATH_REGEX);
  if (!match) return null;
  const [, bucketId, fileId] = match;
  if (bucketId !== appwriteConfig.buckets.campaignAssets) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(fileId)) return null;
  return fileId;
}

/**
 * Hapus file thumbnail dari URL-nya. Best-effort: URL yang tidak dikenali
 * mengembalikan false tanpa error (tidak ada yang dihapus).
 * @throws bila fileId valid tetapi permintaan delete gagal.
 */
export async function deleteCampaignThumbnailByUrl(url: string): Promise<boolean> {
  const fileId = parseCampaignThumbnailFileId(url);
  if (!fileId) return false;
  await deletePublicFile(appwriteConfig.buckets.campaignAssets, fileId);
  return true;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Salin thumbnail campaign sumber menjadi file BARU di bucket yang sama
 * (duplikasi campaign tidak boleh berbagi file/URL dengan sumber).
 * @throws bila fetch sumber atau unggah salinan gagal — pemanggil wajib
 * membatalkan duplikasi, bukan melanjutkan tanpa thumbnail.
 */
export async function copyCampaignThumbnail(
  sourceUrl: string,
  ownerUserId: string
): Promise<UploadedFile> {
  const res = await fetch(sourceUrl, { mode: "cors" });
  if (!res.ok) throw new FileRuleError(`Gagal membaca thumbnail sumber (HTTP ${res.status}).`);
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) {
    throw new FileRuleError("Thumbnail sumber bukan gambar.");
  }
  const ext = EXT_BY_MIME[blob.type] ?? "jpg";
  const file = new File([blob], `campaign-thumbnail.${ext}`, { type: blob.type });
  return uploadCampaignThumbnail(file, ownerUserId);
}
