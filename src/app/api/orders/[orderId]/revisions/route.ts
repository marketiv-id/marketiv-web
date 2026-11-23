import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, json, readJsonBody } from "@/server/http";
import { requestRevision } from "@/server/orders/orders";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ orderId: string }> };

/** POST /api/orders/[orderId]/revisions — UMKM pemilik order → 201 Revision. */
export function POST(request: Request, context: Context) {
  return apiRoute("orders.revisions", async () => {
    const { orderId } = await context.params;
    const { user } = await requireUser({
      role: "umkm",
      messages: {
        notFound: "Profil Pengguna tidak ditemukan.",
        inactive: "Akun Anda sedang tidak aktif.",
        wrongRole: "Hanya UMKM yang dapat meminta revisi.",
      },
    });
    const body = await readJsonBody(request);
    return json(await requestRevision({ db: createAdminClient(), userId: user.id }, orderId, body), 201);
  })(request);
}
