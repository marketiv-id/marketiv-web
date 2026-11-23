import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute } from "@/server/http";
import { acceptOffer } from "@/server/offers/offers";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ offerId: string }> };

/** POST /api/offers/[offerId]/accept — kreator → `{ offerId, orderId, status, alreadyAccepted }`. */
export function POST(request: Request, context: Context) {
  return apiRoute("offers.accept", async () => {
    const { offerId } = await context.params;
    const { user } = await requireUser({
      role: "creator",
      messages: { wrongRole: "Hanya kreator penerima yang dapat menjawab penawaran ini." },
    });
    return acceptOffer({ db: createAdminClient(), userId: user.id }, offerId);
  })(request);
}
