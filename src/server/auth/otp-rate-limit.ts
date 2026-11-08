import "server-only";

import { createHash } from "node:crypto";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { HttpError } from "./http-error";

/** Sama dengan request-password-otp lama: 3 permintaan per 10 menit per email+IP. */
export const OTP_RATE_LIMIT_MAX = 3;
export const OTP_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

export type OtpPurpose = "password" | "email";

/**
 * IP klien dari header proxy. Netlify mengisi `x-nf-client-connection-ip`;
 * `x-forwarded-for` dipakai sebagai cadangan (ambil entri pertama).
 */
export function clientIp(headers: Headers): string {
  const candidates = [
    headers.get("x-nf-client-connection-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("x-real-ip"),
  ];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed.slice(0, 100);
  }
  return "unknown";
}

/** Kunci deterministik (≤ 64 char) per tujuan + email + IP. */
export function otpRateLimitKey(purpose: OtpPurpose, email: string, ip: string): string {
  const digest = createHash("sha256").update(`${email}|${ip}`).digest("hex").slice(0, 48);
  return `${purpose}:${digest}`;
}

/**
 * Catat satu permintaan OTP; lempar 429 bila melewati batas.
 * Atomik di Postgres (`public.hit_otp_rate_limit`).
 */
export async function enforceOtpRateLimit(
  admin: AdminSupabaseClient,
  args: { purpose: OtpPurpose; email: string; ip: string },
): Promise<void> {
  const { data, error } = await admin.rpc("hit_otp_rate_limit", {
    p_key: otpRateLimitKey(args.purpose, args.email, args.ip),
    p_email: args.email,
    p_ip: args.ip,
    p_max: OTP_RATE_LIMIT_MAX,
    p_window_seconds: OTP_RATE_LIMIT_WINDOW_SECONDS,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.blocked) {
    throw new HttpError(
      429,
      "Terlalu banyak permintaan kode OTP. Tunggu beberapa menit lalu coba lagi.",
      "validation",
      { retryAfterSeconds: row.retry_after_seconds },
    );
  }
}
