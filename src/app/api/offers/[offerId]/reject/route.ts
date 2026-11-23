import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute } from "@/server/http";
import { rejectOffer } from "@/server/offers/offers";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ offerId: string }> };

/** POST /api/offers/[offerId]/reject — kreator menolak offer pending. */
export function POST(request: Request, context: Context) {
  return apiRoute("offers.reject", async () => {
    const { offerId } = await context.params;
    const { user } = await requireUser({
      role: "creator",
      messages: { wrongRole: "Hanya kreator penerima yang dapat menjawab penawaran ini." },
    });
    return rejectOffer({ db: createAdminClient(), userId: user.id }, offerId);
  })(request);
}
