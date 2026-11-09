import { NextResponse } from "next/server";

import { authErrorMessage } from "@/lib/auth/auth-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStatelessClient } from "@/lib/supabase/stateless";
import { errorResponse, HttpError, readJsonBody } from "@/server/auth/http-error";
import { requireAuthUser } from "@/server/auth/require-user";

/**
 * POST /api/auth/verify-email — `{ code }`
 *
 * Verifikasi OTP email untuk akun yang SEDANG login, lalu catat
 * `users.email_verified_at`. Pengganti `account.createSession` + event
 * `user-email-verified`.
 *
 * OTP diverifikasi dengan client tanpa cookie, jadi sesi browser tidak
 * tersentuh (dulu sesi harus dihapus & dibuat ulang). Sesi sementara hasil
 * verifikasi langsung dicabut.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) {
      throw new HttpError(400, "Masukkan kode 6 digit dari email kamu.");
    }

    const { user, userRow } = await requireAuthUser();
    if (!user.email) throw new HttpError(400, "Akun ini belum punya email.");
    if (!userRow) {
      throw new HttpError(404, "Profil pengguna belum tersedia. Coba buat profil terlebih dahulu.");
    }
    if (userRow.email_verified_at) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const stateless = createStatelessClient();
    const { data, error } = await stateless.auth.verifyOtp({
      email: user.email,
      token: code,
      type: "email",
    });
    if (error || !data.user) {
      const serverFailure = (error?.status ?? 0) >= 500;
      throw new HttpError(
        serverFailure ? 502 : 400,
        authErrorMessage(error, "Kode OTP salah atau kedaluwarsa. Minta kode baru."),
        serverFailure ? "server" : "validation",
      );
    }
    if (data.user.id !== user.id) {
      throw new HttpError(403, "Kode ini bukan untuk akun yang sedang login.");
    }

    const { error: updateError } = await createAdminClient()
      .from("users")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("email_verified_at", null);
    if (updateError) throw updateError;

    // Cabut sesi sementara dari verifyOtp (sesi browser tetap).
    await stateless.auth.signOut({ scope: "local" }).catch(() => undefined);

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "auth.verify-email");
  }
}
