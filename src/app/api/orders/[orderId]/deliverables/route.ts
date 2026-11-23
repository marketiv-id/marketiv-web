import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, json, readJsonBody } from "@/server/http";
import { submitDeliverable } from "@/server/orders/orders";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ orderId: string }> };

/** POST /api/orders/[orderId]/deliverables — kreator pengerja → 201 Deliverable. */
export function POST(request: Request, context: Context) {
  return apiRoute("orders.deliverables", async () => {
    const { orderId } = await context.params;
    const { user } = await requireUser({
      role: "creator",
      messages: { wrongRole: "Hanya kreator pengerja yang dapat mengirim deliverable." },
    });
    const body = await readJsonBody(request);
    return json(await submitDeliverable({ db: createAdminClient(), userId: user.id }, orderId, body), 201);
  })(request);
}
