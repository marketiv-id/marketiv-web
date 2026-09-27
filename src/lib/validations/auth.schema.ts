import { z } from "zod";
import {
  emailAddress,
  enumOf,
  indonesianPhone,
  requiredString,
  requiredStringMax,
} from "./common";

/**
 * Skema autentikasi — login, register 2 role, lupa & reset password.
 *
 * Sumber aturan: 00_BACKEND/docs/02_Modules/Authentication/30_Business_Rules.md.
 * Nomor HP wajib untuk UMKM dan tidak untuk Kreator — itu aturan bisnis, bukan
 * preferensi UI.
 */

/**
 * Batas password Appwrite Auth. Diekspor supaya form bisa menampilkan
 * hint panjangnya tanpa menduplikasi angkanya.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 256;

/**
 * Password baru (register & reset).
 *
 * Sengaja TIDAK diekspor dan TIDAK ditaruh di common.ts: ini bukan tipe field
 * generik, melainkan cerminan kebijakan server Appwrite. Kalau dipakai form lain
 * yang tidak bicara ke Appwrite Auth, ia akan drift begitu kebijakannya berubah.
 */
const newPassword = z
  .string({ error: "Kata Sandi wajib diisi." })
  .min(PASSWORD_MIN, `Password minimal ${PASSWORD_MIN} karakter.`)
  .max(PASSWORD_MAX, `Password maksimal ${PASSWORD_MAX} karakter.`);

/** Role yang boleh mendaftar sendiri. `admin` dibuat lewat konsol, bukan form. */
export const registrableRoleSchema = enumOf(["umkm", "creator"] as const, "Role");
export type RegistrableRole = z.infer<typeof registrableRoleSchema>;

/**
 * Login.
 *
 * `password` sengaja hanya `requiredString`, BUKAN aturan PASSWORD_MIN. Memaksa
 * panjang minimum saat login membocorkan kebijakan ke penyerang dan mengunci akun
 * yang dibuat sebelum kebijakan itu berlaku. Kekuatan password divalidasi saat
 * dibuat (register/reset), bukan saat dipakai.
 */
export const loginSchema = z.object({
  email: emailAddress(),
  password: requiredString("Kata Sandi"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Register UMKM.
 *
 * Identitas bisnis dikumpulkan onboarding UMKM, bukan registrasi akun.
 */
export const registerUmkmSchema = z.object({
  email: emailAddress(),
  phone: indonesianPhone,
  password: newPassword,
});
export type RegisterUmkmInput = z.infer<typeof registerUmkmSchema>;

/** Register Kreator — tanpa nomor HP, sesuai 30_Business_Rules.md. */
export const registerCreatorSchema = z.object({
  displayName: requiredStringMax("Nama lengkap", 255),
  email: emailAddress(),
  password: newPassword,
});
export type RegisterCreatorInput = z.infer<typeof registerCreatorSchema>;

/** Lupa password — hanya email; OTP dikirim lewat Function server-side. */
export const forgotPasswordSchema = z.object({
  email: emailAddress(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password. Untuk link legacy, `userId` & `secret` datang dari query string.
 * Untuk OTP, Function server-side memvalidasi `userId` + OTP sebelum ganti password.
 */
export const resetPasswordSchema = z
  .object({
    password: newPassword,
    passwordConfirm: requiredString("Konfirmasi password"),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "Konfirmasi password tidak sama.",
    path: ["passwordConfirm"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
