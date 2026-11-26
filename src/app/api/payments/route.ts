import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, readJsonBody } from "@/server/http";
import { requireMidtransConfig } from "@/server/payments/config";
import { createPayment, feeRateFromEnv } from "@/server/payments/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/payments — `{ purpose: "order", orderId, amount, finishUrl? }` atau
 * `{ purpose: "campaign", campaignId, amount }` → `PaymentIntent` (Snap token).
 */
export const POST = apiRoute("payments.create", async (request) => {
  const { user } = await requireUser({ role: "umkm" });
  const midtrans = requireMidtransConfig();
  const body = await readJsonBody(request);
  return createPayment({ db: createAdminClient(), userId: user.id, midtrans, feeRate: feeRateFromEnv() }, body);
});
