import { createAdminClient } from "@/lib/supabase/admin";
import { apiRoute, HttpError } from "@/server/http";
import { requireMidtransConfig } from "@/server/payments/config";
import { handleMidtransNotification } from "@/server/payments/webhook";

export const dynamic = "force-dynamic";
// node:crypto (SHA512 + timingSafeEqual).
export const runtime = "nodejs";

/**
 * POST /api/webhooks/midtrans — Payment Notification URL Midtrans.
 * Tanpa sesi: diverifikasi lewat signature_key. Lihat src/server/payments/webhook.ts.
 */
export const POST = apiRoute("webhooks.midtrans", async (request) => {
  const midtrans = requireMidtransConfig();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  return handleMidtransNotification({ db: createAdminClient(), midtrans }, body);
});
