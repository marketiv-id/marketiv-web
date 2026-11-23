/**
 * Campaign Product Thumbnail — helper khusus campaign di atas `storage.ts`
 * (Supabase). Pengganti `src/lib/appwrite/campaign-thumbnail.ts`.
 *
 * Thumbnail = gambar produk utama campaign (`campaigns.thumbnail_url`), disimpan
 * di bucket publik `campaign-assets` pada path `<uid>/<uuid>.<ext>`.
 *
 * File ini hanya:
 * - validasi gambar sebelum unggah (campaign-assets mengizinkan semua MIME,
 *   jadi aturan gambar didefinisikan di sini — SATU tempat);
 * - mem-parse path objek dari URL publik secara ketat (gagal aman) supaya
 *   penghapusan tidak pernah menyentuh objek arbitrer dari URL tak terpercaya;
 * - menyalin thumbnail sebagai file BARU saat duplikasi campaign.
 *
 * Server (`/api/campaigns/**`) memvalidasi ulang URL: hanya URL publik
 * campaign-assets di folder milik pengguna yang diterima.
 */
import { createClient } from "./client";
import {
  assertFileAllowed,
  BUCKET_IDS,
  deletePublicFile,
  FileRuleError,
  parsePublicFileUrl,
  publicFileUrl,
  uploadPublicFile,
  type UploadedFile,
} from "./storage";

export { FileRuleError };

const BUCKET = BUCKET_IDS.campaignAssets;

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
export async function uploadCampaignThumbnail(file: File, ownerUserId: string): Promise<UploadedFile> {
  assertCampaignThumbnailFile(file);
  return uploadPublicFile("campaignAssets", file, ownerUserId);
}

/**
 * Path objek thumbnail (`<uid>/<file>`) dari URL publik bucket campaign-assets
 * project ini. `null` bila host, bucket, atau bentuk path tidak cocok —
 * termasuk URL Appwrite campaign lama (tidak pernah dihapus dari sini).
 */
export function parseCampaignThumbnailPath(url: string): string | null {
  const parsed = parsePublicFileUrl(url);
  if (!parsed || parsed.bucketId !== BUCKET) return null;
  const [folder, file] = parsed.path.split("/");
  if (!folder || !file || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file)) return null;
  return parsed.path;
}

/**
 * Hapus file thumbnail dari URL-nya. Best-effort: URL yang tidak dikenali
 * mengembalikan false tanpa error (tidak ada yang dihapus). Policy storage
 * hanya mengizinkan folder milik sendiri.
 * @throws bila path valid tetapi permintaan delete gagal.
 */
export async function deleteCampaignThumbnailByUrl(url: string): Promise<boolean> {
  const path = parseCampaignThumbnailPath(url);
  if (!path) return false;
  await deletePublicFile(BUCKET, path);
  return true;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function newPath(ownerUserId: string, sourcePath: string): string {
  const dot = sourcePath.lastIndexOf(".");
  const ext = dot >= 0 ? sourcePath.slice(dot + 1) : "";
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${ownerUserId}/${ext ? `${id}.${ext}` : id}`;
}

/**
 * Salin thumbnail campaign sumber menjadi file BARU (duplikasi campaign tidak
 * boleh berbagi file/URL dengan sumber).
 *
 * - Sumber di folder milik sendiri pada bucket ini → `storage.copy` (server-side,
 *   tanpa unduh ulang).
 * - Sumber lain (mis. URL Appwrite campaign legacy) → unduh lalu unggah ulang,
 *   sama dengan perilaku lama.
 * @throws bila salin/unduh/unggah gagal — pemanggil wajib membatalkan
 * duplikasi, bukan melanjutkan tanpa thumbnail.
 */
export async function copyCampaignThumbnail(sourceUrl: string, ownerUserId: string): Promise<UploadedFile> {
  const sourcePath = parseCampaignThumbnailPath(sourceUrl);
  if (sourcePath && sourcePath.startsWith(`${ownerUserId}/`)) {
    const target = newPath(ownerUserId, sourcePath);
    const { error } = await createClient().storage.from(BUCKET).copy(sourcePath, target);
    if (error) throw error;
    return {
      fileId: target,
      bucketId: BUCKET,
      url: publicFileUrl(BUCKET, target),
      name: target.slice(target.lastIndexOf("/") + 1),
      sizeBytes: 0,
    };
  }

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
