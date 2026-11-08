import { NextResponse } from "next/server";

import { authErrorCode, authErrorMessage } from "@/lib/auth/auth-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStatelessClient } from "@/lib/supabase/stateless";
import { errorResponse, HttpError } from "@/server/auth/http-error";
import { clientIp, enforceOtpRateLimit } from "@/server/auth/otp-rate-limit";
import { requireAuthUser } from "@/server/auth/require-user";

/**
 * POST /api/auth/email-otp — kirim kode OTP verifikasi ke email akun yang login.
 *
 * Pengganti `account.createEmailToken`. Email diambil dari sesi, tidak dari body.
 * Kode dikirim lewat template "Magic Link" Supabase ({{ .Token }}).
 */
export async function POST(request: Request) {
  try {
    const { user, userRow } = await requireAuthUser();
    if (!user.email) throw new HttpError(400, "Akun ini belum punya email.");
    if (userRow?.email_verified_at) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const admin = createAdminClient();
    await enforceOtpRateLimit(admin, {
      purpose: "email",
      email: user.email,
      ip: clientIp(request.headers),
    });

    const { error } = await createStatelessClient().auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      throw new HttpError(
        error.status ?? 400,
        authErrorMessage(error, "Gagal mengirim kode verifikasi. Coba lagi."),
        authErrorCode(error),
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "auth.email-otp");
  }
}
