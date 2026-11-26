import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, readJsonBody } from "@/server/http";
import { approveDeliverable } from "@/server/orders/orders";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ deliverableId: string }> };

/**
 * POST /api/deliverables/[deliverableId]/approve — UMKM pemilik order.
 * Body opsional `{ orderId }` (dicocokkan). Approve + `release_escrow` dalam
 * satu transaksi (0026).
 */
export function POST(request: Request, context: Context) {
  return apiRoute("deliverables.approve", async () => {
    const { deliverableId } = await context.params;
    const { user } = await requireUser({
      role: "umkm",
      messages: { wrongRole: "Hanya UMKM pemilik pesanan yang dapat menyetujui deliverable." },
    });
    const body = await readJsonBody(request).catch(() => ({}));
    return approveDeliverable({ db: createAdminClient(), userId: user.id }, deliverableId, body);
  })(request);
}
