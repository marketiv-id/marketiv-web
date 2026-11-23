import { callApi } from "@/lib/api/call-api";
import { createClient } from "@/lib/supabase/client";
import type { ServiceResult } from "@/types/domain";
import { ok, fail, failFromWriteError, requireUserId } from "@/services/shared/service-result";

/**
 * Unggah berkas ke File Manager (bucket privat `user-files`) — Fase 6.
 *
 * Tiga langkah, berkas TIDAK pernah lewat body route (batas function Netlify):
 *   1. `POST /api/files/upload-url` — validasi tipe/ukuran + pra-cek kuota →
 *      `{ bucketId, path, token }`.
 *   2. `storage.uploadToSignedUrl(path, token, file)` — langsung ke Storage.
 *   3. `POST /api/files/confirm` — catat `user_files` + debit kuota dalam satu
 *      transaksi (ukuran diambil dari objek yang tersimpan, bukan dari klien).
 *
 * Kuota tetap ditegakkan server: `user_storage_usage` tidak bisa ditulis
 * browser (RLS SELECT-only).
 *
 * Nama `uploadUserFileInAppwrite` dipertahankan supaya facade
 * `user-file.service.ts` tidak perlu berubah; implementasinya Supabase.
 */

/** Sejajar `MAX_USER_FILE_BYTES` di `src/server/files/shared.ts` (20 MiB). */
export const MAX_USER_FILE_BYTES = 20 * 1024 * 1024;

type UploadedUserFile = {
  /** `id` baris `user_files` — inilah yang disimpan `deliverables.file_id`. */
  fileId: string;
  /**
   * URL STABIL `/api/files/<id>/url?redirect=1`: setiap dibuka, server mengecek
   * hak akses (pemilik / pihak order yang dibagikan / admin) lalu mengalihkan ke
   * signed URL baru (5 menit). Aman disimpan di `deliverables.file_url`.
   */
  fileUrl: string;
  fileName: string;
};

type UploadUrlResponse = { bucketId: string; path: string; token: string };
type ConfirmResponse = { status: string; file: { $id: string; fileName: string } };

/** URL stabil (absolut bila di browser) untuk membuka file privat. */
export function userFileUrl(fileId: string): string {
  const path = `/api/files/${encodeURIComponent(fileId)}/url?redirect=1`;
  return typeof window !== "undefined" && window.location?.origin ? `${window.location.origin}${path}` : path;
}

export async function uploadUserFileInAppwrite(input: {
  file: File;
  /**
   * Bila diisi, pihak lawan pada order itu ikut boleh membaca berkasnya.
   * Yang dikirim orderId, BUKAN userId — server memverifikasi pengunggah
   * peserta order dan menurunkan pihak lawan dari baris `orders`.
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
    const target = await callApi<UploadUrlResponse>("createUploadUrl", {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    const { error: uploadError } = await createClient()
      .storage.from(target.bucketId)
      .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type || undefined });
    if (uploadError) {
      // Storage menolak (mis. MIME/ukuran di luar aturan bucket) — sebelum ada
      // baris user_files, jadi kuota tidak terdebit.
      return fail("Gagal mengunggah berkas. Coba lagi.", "server", empty);
    }

    const confirmed = await callApi<ConfirmResponse>("confirmUpload", {
      path: target.path,
      fileName: file.name,
      ...(shareWithOrderId ? { shareWithOrderId } : {}),
    });

    return ok({
      fileId: confirmed.file.$id,
      fileUrl: userFileUrl(confirmed.file.$id),
      fileName: confirmed.file.fileName,
    });
  } catch (err) {
    return failFromWriteError<UploadedUserFile>(err, empty);
  }
}
