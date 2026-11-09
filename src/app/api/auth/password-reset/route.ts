import { NextResponse } from "next/server";

import { authErrorCode, authErrorMessage } from "@/lib/auth/auth-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStatelessClient } from "@/lib/supabase/stateless";
import { resetPasswordSchema } from "@/lib/validations/auth.schema";
import { errorResponse, HttpError, readJsonBody } from "@/server/auth/http-error";
import { parseBody } from "@/server/auth/validate";

/**
 * POST /api/auth/password-reset — `{ email, otpCode, password, passwordConfirm }`
 *
 * Pengganti Function `reset-password-with-otp`:
 *   1. `verifyOtp(type: 'recovery')` membuktikan pemilik email.
 *   2. `auth.admin.updateUserById` mengganti password.
 *   3. `auth.admin.signOut(jwt, 'global')` mencabut SEMUA sesi akun itu.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { password } = parseBody(resetPasswordSchema, body, "Password baru belum valid.");
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const otpCode = typeof body.otpCode === "string" ? body.otpCode.trim() : "";
    if (!email || !/^\d{6}$/.test(otpCode)) {
      throw new HttpError(400, "Email atau kode OTP 6 digit belum valid. Minta kode baru.");
    }

    const { data, error } = await createStatelessClient().auth.verifyOtp({
      email,
      token: otpCode,
      type: "recovery",
    });
    if (error || !data.user || !data.session) {
      const serverFailure = (error?.status ?? 0) >= 500;
      throw new HttpError(
        serverFailure ? 502 : 400,
        authErrorMessage(error, "Kode OTP salah atau kedaluwarsa. Minta kode baru."),
        serverFailure ? "server" : "validation",
      );
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, { password });
    if (updateError) {
      throw new HttpError(
        updateError.status && updateError.status < 500 ? 400 : 500,
        authErrorMessage(updateError, "Gagal mengatur ulang password. Coba lagi."),
        authErrorCode(updateError),
      );
    }

    // Semua sesi lama (termasuk sesi sementara dari verifyOtp) dicabut.
    const { error: signOutError } = await admin.auth.admin.signOut(data.session.access_token, "global");
    if (signOutError) {
      console.warn("[api.auth.password-reset] signOut global gagal", signOutError.code ?? signOutError.status);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "auth.password-reset");
  }
}
