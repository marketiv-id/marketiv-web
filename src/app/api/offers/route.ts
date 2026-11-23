import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, json, readJsonBody } from "@/server/http";
import { createOffer } from "@/server/offers/offers";

export const dynamic = "force-dynamic";

/** POST /api/offers — Custom Offer UMKM → 201 `{ offerId }`. */
export const POST = apiRoute("offers.create", async (request) => {
  const { user } = await requireUser({
    role: "umkm",
    messages: {
      notFound: "Profil Pengguna tidak ditemukan.",
      inactive: "Akun Anda sedang tidak aktif.",
      wrongRole: "Hanya UMKM yang dapat mengirim penawaran.",
    },
  });
  const body = await readJsonBody(request);
  return json(await createOffer({ db: createAdminClient(), userId: user.id }, body), 201);
});
