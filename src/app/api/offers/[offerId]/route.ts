import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute } from "@/server/http";
import { deleteOffer } from "@/server/offers/offers";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ offerId: string }> };

/** DELETE /api/offers/[offerId] — UMKM menarik offer yang belum dijawab. */
export function DELETE(request: Request, context: Context) {
  return apiRoute("offers.delete", async () => {
    const { offerId } = await context.params;
    const { user } = await requireUser({ role: "umkm" });
    return deleteOffer({ db: createAdminClient(), userId: user.id }, offerId);
  })(request);
}
