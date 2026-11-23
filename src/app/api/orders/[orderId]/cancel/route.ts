import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute } from "@/server/http";
import { cancelOrder } from "@/server/orders/orders";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ orderId: string }> };

/** POST /api/orders/[orderId]/cancel — UMKM aktif, hanya order `pending_payment`. */
export function POST(request: Request, context: Context) {
  return apiRoute("orders.cancel", async () => {
    const { orderId } = await context.params;
    const { user } = await requireUser({
      role: "umkm",
      messages: { inactive: "Akun UMKM aktif diperlukan", wrongRole: "Akun UMKM aktif diperlukan" },
    });
    return cancelOrder({ db: createAdminClient(), userId: user.id }, orderId);
  })(request);
}
