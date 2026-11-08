import { NextResponse } from "next/server";

import { authErrorCode, authErrorMessage } from "@/lib/auth/auth-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { registerCreatorSchema, registerUmkmSchema } from "@/lib/validations/auth.schema";
import { errorResponse, HttpError, readJsonBody } from "@/server/auth/http-error";
import { isRegistrableRole, provisionUser } from "@/server/auth/provision";
import { parseBody } from "@/server/auth/validate";
import type { ServiceErrorCode } from "@/types/domain";

/**
 * POST /api/auth/register
 *
 * Body: `{ role: "umkm" | "creator", email, password, phone? (umkm), displayName? (creator) }`
 *
 * 1. Role di-whitelist di server (bukan `prefs.role` dari browser — celah #1).
 * 2. `auth.signUp` lewat client cookie → sesi langsung tertulis di cookie respons.
 * 3. RPC `provision_user` (service role) membuat users + profil + wallet + kuota
 *    dalam satu transaksi. Pengganti event users.*.create.
 *
 * Kegagalan langkah 3 dikembalikan sebagai SUKSES dengan
 * `profileProvisioned: false`: akun dan sesi sudah ada, dan UI punya tombol
 * "coba lagi" (`POST /api/auth/provision`). Mengulang register justru buntu di
 * "email sudah terdaftar".
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const role = body.role;
    if (!isRegistrableRole(role)) {
      throw new HttpError(400, "Role pendaftaran tidak valid.");
    }

    const input =
      role === "umkm"
        ? parseBody(registerUmkmSchema, body, "Data pendaftaran belum lengkap.")
        : parseBody(registerCreatorSchema, body, "Data pendaftaran belum lengkap.");
    const phone = "phone" in input ? input.phone : undefined;
    const displayName = "displayName" in input ? input.displayName : undefined;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        // user_metadata hanya untuk tampilan & pemulihan provisioning; role di
        // sini tetap di-whitelist lagi oleh /api/auth/provision.
        data: {
          role,
          ...(displayName ? { display_name: displayName } : {}),
          ...(phone ? { phone } : {}),
        },
      },
    });

    if (error) {
      throw new HttpError(
        error.status && error.status >= 400 && error.status < 600 ? error.status : 400,
        authErrorMessage(error, "Gagal membuat akun. Coba lagi."),
        authErrorCode(error),
      );
    }
    // Saat konfirmasi email aktif, Supabase menyamarkan email terdaftar sebagai
    // user tanpa identity (bukan error).
    if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
      throw new HttpError(409, "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.");
    }

    let profileProvisioned = true;
    let provisionErrorCode: ServiceErrorCode | undefined;
    let provisionError: string | undefined;
    try {
      await provisionUser(createAdminClient(), data.user, role, { phone, displayName });
    } catch (err) {
      console.error("[api.auth.register] provision_user gagal", err);
      profileProvisioned = false;
      provisionErrorCode = err instanceof HttpError ? err.code : "server";
      provisionError =
        err instanceof HttpError ? err.message : "Gagal membuat profil pengguna. Coba lagi.";
    }

    return NextResponse.json({
      userId: data.user.id,
      sessionCreated: data.session != null,
      profileProvisioned,
      ...(provisionErrorCode ? { provisionErrorCode, provisionError } : {}),
    });
  } catch (err) {
    return errorResponse(err, "auth.register");
  }
}
