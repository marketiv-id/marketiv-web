import { z } from "zod";
import { optionalString, requiredString } from "./common";

/**
 * Deliverable & permintaan revisi — Rate Card Mode, Alur B.
 *
 * BATAS PANJANG DISAMAKAN DENGAN KOLOM di 00_BACKEND/appwrite.config.json:
 *   deliverables.fileUrl  string(2048) wajib
 *   deliverables.notes    string(2000) opsional
 *   revisions.message     string(2000) wajib
 */

const MAX_FILE_URL = 2048;
const MAX_NOTES = 2000;
const MAX_REVISION_MESSAGE = 2000;

/**
 * URL eksternal deliverable.
 *
 * HTTPS saja — `docs/03_Workflows/30_RateCard_Order.md` menyebutnya eksplisit,
 * dan mirror `order.service.ts:216` menolak apa pun selain `https://`. Menerima
 * `http://` berarti bukti kerja bisa dikirim lewat kanal yang bisa disadap dan
 * diubah di tengah jalan.
 */
export const externalDeliverableUrl = requiredString("Tautan hasil kerja")
  .max(MAX_FILE_URL, `Tautan hasil kerja maksimal ${MAX_FILE_URL} karakter.`)
  .refine((value) => value.startsWith("https://"), {
    message: "Tautan harus diawali https://. Tautan http biasa tidak diterima.",
  })
  .refine((value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, { message: "Format tautan tidak valid." });

/**
 * Dua sumber deliverable.
 *
 * `external_url` — tautan https ke postingan atau penyimpanan pihak ketiga.
 * `storage` — berkas diunggah ke File Manager lewat `validate-and-upload`,
 *   yang kini bisa membagikan izin baca ke pihak lawan order lewat
 *   `shareWithOrderId`. Tanpa itu UMKM tidak bisa membuka berkas yang harus ia
 *   review, dan jalur ini memang tertutup sampai 2026-07-28.
 *
 * Keduanya sama-sama menyimpan `fileUrl`; yang membedakan adalah `fileId` —
 * hanya jalur storage yang punya baris `user_files` untuk ditautkan.
 */
export const uploadDeliverableSchema = z
  .object({
    orderId: requiredString("Order"),
    source: z.enum(["external_url", "storage"], {
      error: "Sumber hasil kerja tidak valid.",
    }),
    fileUrl: requiredString("Tautan hasil kerja").max(
      MAX_FILE_URL,
      `Tautan hasil kerja maksimal ${MAX_FILE_URL} karakter.`
    ),
    /** Wajib untuk `storage` — `$id` baris `user_files`. */
    fileId: optionalString(255, "File ID"),
    notes: optionalString(MAX_NOTES, "Catatan"),
  })
  .superRefine((value, ctx) => {
    if (value.source === "external_url") {
      const result = externalDeliverableUrl.safeParse(value.fileUrl);
      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          path: ["fileUrl"],
          message: result.error.issues[0]?.message ?? "Tautan hasil kerja tidak valid.",
        });
      }
      return;
    }

    if (!value.fileId) {
      ctx.addIssue({
        code: "custom",
        path: ["fileId"],
        message: "Berkas belum terunggah.",
      });
    }
  });

export const requestRevisionSchema = z.object({
  orderId: requiredString("Order"),
  message: requiredString("Alasan revisi").max(
    MAX_REVISION_MESSAGE,
    `Alasan revisi maksimal ${MAX_REVISION_MESSAGE} karakter.`
  ),
});

export type UploadDeliverableInput = z.infer<typeof uploadDeliverableSchema>;
export type RequestRevisionInput = z.infer<typeof requestRevisionSchema>;
