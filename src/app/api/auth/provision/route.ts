import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, HttpError, readJsonBody } from "@/server/auth/http-error";
import { isRegistrableRole, provisionUser } from "@/server/auth/provision";
import { requireAuthUser } from "@/server/auth/require-user";

/**
 * POST /api/auth/provision — `{ role? }`
 *
 * Membuat (atau melengkapi) users + profil + wallet + kuota untuk akun yang
 * SEDANG login. Dipakai: akhir OAuth Google (akun baru), tombol "coba lagi"
 * saat provisioning register gagal, dan self-heal saat login.
 *
 * Role: dari body bila ada, kalau tidak dari `user_metadata.role` yang ditulis
 * saat register. Keduanya di-whitelist `umkm`/`creator` — admin TIDAK pernah
 * bisa dibuat lewat sini. Baris yang sudah ada tidak berubah role-nya (RPC).
 */
export async function POST(request: Request) {
  try {
    // Body opsional: request tanpa body / body rusak diperlakukan sebagai `{}`.
    const body: Record<string, unknown> = await readJsonBody(request).catch(() => ({}));
    const { user, userRow } = await requireAuthUser();

    // Admin dibuat lewat allowlist, bukan provisioning mandiri.
    if (userRow?.role === "admin") {
      return NextResponse.json({ status: "ok", userId: userRow.id, role: userRow.role });
    }

    const requested = body.role ?? user.user_metadata?.role;
    const role = userRow?.role ?? requested;
    if (!isRegistrableRole(role)) {
      throw new HttpError(
        400,
        "Role akun belum diketahui. Daftar ulang lewat halaman register.",
      );
    }

    const row = await provisionUser(createAdminClient(), user, role);
    return NextResponse.json({ status: "ok", userId: row.id, role: row.role });
  } catch (err) {
    return errorResponse(err, "auth.provision");
  }
}
