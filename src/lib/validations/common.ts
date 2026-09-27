/**
 * Common Validation Schemas & Helpers
 *
 * Reusable Zod primitives shared across campaign wizard, profile forms,
 * rate card forms, and finance forms.
 *
 * Do NOT add feature-specific schemas here.
 * Feature schemas (e.g., campaign wizard) belong in their own validation files.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * @deprecated Batas ukuran file beda per bucket (5MB avatars/logos, 50MB
 * portfolios, 100MB campaign-assets). Gunakan BUCKET_RULES/assertFileAllowed di
 * src/lib/appwrite/storage.ts, bukan konstanta tunggal ini.
 */
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

/** Minimum campaign / rate card price in Rupiah. */
export const MIN_CURRENCY_IDR = 1000;

// ---------------------------------------------------------------------------
// Primitive Helpers
// ---------------------------------------------------------------------------

/**
 * Required non-empty string.
 * Use for names, titles, descriptions, and any mandatory text field.
 */
export const requiredString = (fieldName = "Field ini") =>
  z
    .string({ error: `${fieldName} wajib diisi.` })
    .min(1, `${fieldName} tidak boleh kosong.`);

/**
 * String wajib DENGAN batas panjang kolom Appwrite.
 *
 * Pakai ini kalau nilainya masuk ke kolom string ber-size. Tanpa batas, input
 * yang lebih panjang dari kolom baru ditolak Appwrite saat createDocument/
 * updateDocument (400) dan user cuma melihat pesan generik "Gagal menyimpan
 * data" — bukan "Nama paket maksimal 100 karakter". `max` harus disamakan
 * dengan `size` kolom di 00_BACKEND/appwrite.config.json.
 */
export const requiredStringMax = (fieldName: string, max: number) =>
  requiredString(fieldName).max(max, `${fieldName} maksimal ${max} karakter.`);

/**
 * Optional URL string.
 * Accepts empty string or a valid URL. Returns undefined when empty.
 */
export const optionalUrl = z
  .string()
  .url("URL tidak valid. Pastikan diawali dengan https://.")
  .optional()
  .or(z.literal(""));

/**
 * Required HTTPS URL.
 * Enforces HTTPS scheme — no plain HTTP or bare paths.
 */
export const requiredHttpsUrl = (fieldName = "URL") =>
  z
    .string({ error: `${fieldName} wajib diisi.` })
    .url(`${fieldName} tidak valid.`)
    .refine((url) => url.startsWith("https://"), {
      message: `${fieldName} harus menggunakan HTTPS.`,
    });

/**
 * Indonesian / WhatsApp phone number.
 *
 * Nomor seluler Indonesia SELALU diawali `08`/`+628`/`628` (prefix `8` sesudah
 * kode negara). Regex ini menuntut prefix itu, jadi masukan 2–5 digit atau nomor
 * tanpa `8` ditolak — bukan hanya "terlalu pendek". Panjang total 10–13 digit.
 */
export const indonesianPhone = z
  .string()
  .trim()
  .regex(
    /^(\+62|62|0)8[0-9]{8,11}$/,
    "Nomor WhatsApp harus diawali 08, 628, atau +628 dan terdiri dari 10–13 digit angka."
  );

/**
 * Alamat email.
 *
 * Zod v4 — `z.email()` top-level, bukan `z.string().email()` yang sudah usang.
 * Ditaruh di sini, bukan di auth.schema.ts, karena email adalah tipe field
 * generik sekelas indonesianPhone dan dipakai di luar auth (kolom users.email,
 * form kontak).
 */
export const emailAddress = (fieldName = "Email") =>
  z
    .email({ error: `${fieldName} tidak valid.` })
    .min(1, `${fieldName} wajib diisi.`);

/**
 * Currency amount in Rupiah (integer, stored as IDR cents-equivalent).
 * Must be a positive integer — no decimals, no negatives.
 */
export const currencyAmountIDR = (min = MIN_CURRENCY_IDR) =>
  z
    .number({
      error: "Nominal harga wajib diisi atau harus berupa angka.",
    })
    .int("Nominal harus berupa bilangan bulat tanpa desimal.")
    .positive("Nominal harus lebih dari nol.")
    .min(min, `Nominal minimal adalah Rp ${min.toLocaleString("id-ID")}.`);


/**
 * External asset URL validation.
 * Used for raw video assets (Google Drive, Dropbox, OneDrive).
 * Must be HTTPS. Raw video files must NOT be uploaded to Appwrite Storage.
 */
export const externalAssetUrl = requiredHttpsUrl("Tautan aset eksternal");

/**
 * @deprecated Lihat MAX_FILE_SIZE_BYTES — gunakan assertFileAllowed per bucket.
 */
export function validateFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES;
}

// ---------------------------------------------------------------------------
// Primitive tambahan (Sprint 3)
// ---------------------------------------------------------------------------

/** String opsional dengan batas panjang. Menerima "" (dikirim sebagai kosong). */
export const optionalString = (max = 2000, fieldName = "Field ini") =>
  z
    .string()
    .max(max, `${fieldName} maksimal ${max} karakter.`)
    .optional()
    .or(z.literal(""));

/** Enum dari daftar nilai, dengan pesan Indonesia. */
export const enumOf = <T extends readonly [string, ...string[]]>(
  values: T,
  fieldName = "Pilihan"
) => z.enum(values, { error: `${fieldName} tidak valid.` });

/** Bilangan bulat non-negatif (jumlah/kuota/revisi). */
export const integerCount = (fieldName = "Jumlah", min = 0) =>
  z
    .number({ error: `${fieldName} wajib berupa angka.` })
    .int(`${fieldName} harus bilangan bulat.`)
    .min(min, `${fieldName} minimal ${min}.`);

/** String angka saja dengan panjang tertentu (nomor rekening/HP). */
export const digitsOnly = (fieldName = "Nomor", min = 6, max = 20) =>
  z
    .string()
    .regex(
      new RegExp(`^\\d{${min},${max}}$`),
      `${fieldName} harus ${min}-${max} digit angka.`
    );
