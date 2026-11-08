import { NextResponse } from "next/server";

import { authErrorCode, authErrorMessage } from "@/lib/auth/auth-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStatelessClient } from "@/lib/supabase/stateless";
import { forgotPasswordSchema } from "@/lib/validations/auth.schema";
import { errorResponse, HttpError, readJsonBody } from "@/server/auth/http-error";
import { clientIp, enforceOtpRateLimit } from "@/server/auth/otp-rate-limit";
import { parseBody } from "@/server/auth/validate";

/**
 * POST /api/auth/password-otp — `{ email }`
 *
 * Pengganti Function `request-password-otp`: rate limit 3×/10 menit per
 * email+IP (`otp_rate_limits`), lalu `resetPasswordForEmail` mengirim kode OTP
 * lewat template "Reset Password" ({{ .Token }}).
 *
 * Selalu menjawab sukses untuk email yang valid secara format, terdaftar atau
 * tidak, supaya keberadaan akun tidak bocor.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { email } = parseBody(forgotPasswordSchema, body, "Email wajib diisi.");
    const normalized = email.trim().toLowerCase();

    await enforceOtpRateLimit(createAdminClient(), {
      purpose: "password",
      email: normalized,
      ip: clientIp(request.headers),
    });

    const { error } = await createStatelessClient().auth.resetPasswordForEmail(normalized);
    if (error) {
      // Rate limit/konfigurasi Supabase tetap dilaporkan; selain itu jangan bocorkan.
      if (error.status === 429 || (error.status ?? 0) >= 500) {
        throw new HttpError(
          error.status ?? 500,
          authErrorMessage(
            error,
            "Email pemulihan belum bisa dikirim. Tunggu beberapa menit lalu coba lagi.",
          ),
          authErrorCode(error),
        );
      }
      console.warn("[api.auth.password-otp] resetPasswordForEmail", error.code ?? error.status);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "auth.password-otp");
  }
}
