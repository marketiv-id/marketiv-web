import { executeFunction, FUNCTION_IDS } from "@/lib/appwrite/functions";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { ServiceResult } from "@/types/domain";
import { ok, fail, failFromWriteError, requireUserId } from "@/services/shared/service-result";

/**
 * Unggah berkas ke File Manager lewat Function `validate-and-upload`.
 *
 * WAJIB lewat Function, bukan `storage.createFile` langsung: kuota per pengguna
 * disimpan di `user_storage_usage`, yang `$permissions`-nya kosong. Klien tidak
 * bisa mendebit kuotanya sendiri, jadi unggahan langsung akan lolos batas.
 *
 * Berkasnya dikirim sebagai base64 di body JSON. Itu memang boros — 20 MB jadi
 * ~27 MB payload — tapi ini kontrak Function yang sudah ada, dan mengubahnya ke
 * multipart berarti mengubah Function plus semua pemanggilnya. Batas ukuran di
 * bawah sengaja lebih ketat dari batas bucket supaya penolakannya terjadi di
 * klien dengan pesan yang jelas, bukan sebagai 413 dari server.
 */

/** Sejajar MAX_FILE_SIZE_BYTES di validate-and-upload:3. */
export const MAX_USER_FILE_BYTES = 20 * 1024 * 1024;

type UploadedUserFile = {
  /** `$id` baris `user_files` — inilah yang disimpan `deliverables.fileId`. */
  fileId: string;
  /** URL unduh; hanya bisa dibuka pihak yang punya permission baca berkas. */
  fileUrl: string;
  fileName: string;
};

type ValidateAndUploadResponse = {
  status: string;
  file: { $id: string; fileName: string; bucketId: string; storageFileId: string };
  storageFile: { $id: string; bucketId: string };
};

/** File → base64 tanpa prefix data URL. */
async function toBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // Dicicil per potongan: `String.fromCharCode(...bytes)` pada berkas belasan
  // MB melampaui batas jumlah argumen dan melempar RangeError.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// TODO(fase-06): unggah berkas → Route Handler + Supabase Storage (bucket user-files).
export async function uploadUserFileInAppwrite(input: {
  file: File;
  /**
   * Bila diisi, pihak lawan pada order itu ikut diberi izin baca berkasnya.
   *
   * Yang dikirim adalah orderId, BUKAN userId — Function yang menurunkan siapa
   * pihak lawannya setelah memastikan pengunggah memang peserta order tersebut.
   * Tanpa ini, deliverable yang diunggah kreator tidak akan bisa dibuka UMKM
   * yang harus mereviewnya.
   */
  shareWithOrderId?: string;
}): Promise<ServiceResult<UploadedUserFile>> {
  const empty = null as unknown as UploadedUserFile;
  const auth = await requireUserId<UploadedUserFile>(empty);
  if (!auth.ok) return auth.result;

  const { file, shareWithOrderId } = input;

  if (file.size === 0) return fail("Berkas kosong.", "validation", empty);
  if (file.size > MAX_USER_FILE_BYTES) {
    return fail(
      `Ukuran berkas maksimal ${Math.floor(MAX_USER_FILE_BYTES / 1024 / 1024)} MB.`,
      "validation",
      empty
    );
  }

  try {
    const res = await executeFunction<ValidateAndUploadResponse>(FUNCTION_IDS.validateAndUpload, {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      contentBase64: await toBase64(file),
      ...(shareWithOrderId ? { shareWithOrderId } : {}),
    });

    const bucketId = res.storageFile?.bucketId ?? res.file?.bucketId;
    const storageFileId = res.storageFile?.$id ?? res.file?.storageFileId;

    return ok({
      fileId: res.file.$id,
      fileUrl: `${appwriteConfig.endpoint}/storage/buckets/${bucketId}/files/${storageFileId}/view?project=${appwriteConfig.projectId}`,
      fileName: res.file.fileName,
    });
  } catch (err) {
    return failFromWriteError<UploadedUserFile>(err, empty);
  }
}
