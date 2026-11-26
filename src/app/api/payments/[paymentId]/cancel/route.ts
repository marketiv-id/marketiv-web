import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute } from "@/server/http";
import { requireMidtransConfig } from "@/server/payments/config";
import { cancelPayment } from "@/server/payments/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ paymentId: string }> };

/** POST /api/payments/[paymentId]/cancel — pemilik membatalkan payment pending. */
export function POST(request: Request, context: Context) {
  return apiRoute("payments.cancel", async () => {
    const { paymentId } = await context.params;
    const { user } = await requireUser({ role: "umkm" });
    const midtrans = requireMidtransConfig();
    return cancelPayment({ db: createAdminClient(), userId: user.id, midtrans }, paymentId);
  })(request);
}
