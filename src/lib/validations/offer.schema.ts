import { z } from "zod";
import {
  requiredStringMax,
  optionalString,
  currencyAmountIDR,
  integerCount,
} from "./common";

/**
 * Custom Offer — Rate Card Mode, Alur B.
 *
 * `s3-zod-modules` mencantumkan file ini sebagai bagian Sprint 3 tapi ia tidak
 * pernah dibuat; jalur tulis offer memang belum ada sampai Sprint 4 Alur B.
 *
 * BATAS PANJANG DISAMAKAN DENGAN KOLOM `offers` di
 * 00_BACKEND/appwrite.config.json. Tanpa itu, input yang kepanjangan baru
 * ditolak Appwrite saat createDocument (400) dan user hanya melihat "Gagal
 * menyimpan data" alih-alih tahu field mana yang bermasalah.
 *
 *   title         string(255)  wajib
 *   description   string(2000) opsional
 *   price         integer      wajib
 *   deadline      string(255)  wajib
 *   revisionLimit integer      wajib
 *
 * SIAPA YANG BOLEH MENGIRIM — hanya UMKM
 * (docs/02_Modules/Offers/30_Business_Rules.md:13). Aturan itu ditegakkan di
 * service, bukan di skema ini: skema hanya memeriksa bentuk datanya.
 */

/** Harga minimum satu Custom Offer. Sejajar MIN_CURRENCY_IDR. */
export const MINIMUM_OFFER_PRICE = 50_000;

/** Batas atas revisi — angka di atas ini hampir pasti salah ketik. */
const MAX_REVISION_LIMIT = 10;

export const createOfferSchema = z.object({
  conversationId: requiredStringMax("Percakapan", 255),
  creatorId: requiredStringMax("Kreator", 255),
  packageId: optionalString(255, "Paket acuan"),
  title: requiredStringMax("Judul proyek", 255),
  description: optionalString(2000, "Deskripsi lingkup"),
  price: currencyAmountIDR(MINIMUM_OFFER_PRICE),
  /**
   * Kolomnya `string(255)`, bukan datetime — jadi yang divalidasi adalah
   * bentuk ISO-nya, dan tanggalnya harus di masa depan. Deadline kemarin
   * membuat kreator menerima pekerjaan yang sudah lewat tenggat.
   */
  deadline: requiredStringMax("Batas Waktu", 255).refine(
    (value) => {
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) && parsed > Date.now();
    },
    { message: "Batas Waktu harus tanggal yang valid dan belum lewat." }
  ),
  revisionLimit: integerCount("Jumlah revisi", 0).max(
    MAX_REVISION_LIMIT,
    `Jumlah revisi maksimal ${MAX_REVISION_LIMIT}.`
  ),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
