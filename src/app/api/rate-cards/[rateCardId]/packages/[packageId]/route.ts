import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, parseBody, readJsonBody } from "@/server/http";
import { deleteRateCard, updateRateCardPackage } from "@/server/rate-cards/rate-cards";
import { asWriteDb, rateCardWriteSchema } from "@/server/rate-cards/shared";

type Ctx = { params: Promise<{ rateCardId: string; packageId: string }> };

/** PATCH …/packages/[packageId] — update paket in-place + mirror judul/status parent. */
export async function PATCH(request: Request, ctx: Ctx) {
  return apiRoute("rate-cards.packages.update", async () => {
    const ids = await ctx.params;
    const { user } = await requireUser({ role: "creator" });
    const body = parseBody(rateCardWriteSchema, await readJsonBody(request), "Data paket tidak valid.");
    return updateRateCardPackage({ db: asWriteDb(createAdminClient()), userId: user.id }, ids, body);
  })(request);
}

/** DELETE …/packages/[packageId] — hapus paket (parent ikut bila kosong; 409 bila ada order berjalan). */
export async function DELETE(request: Request, ctx: Ctx) {
  return apiRoute("rate-cards.packages.delete", async () => {
    const ids = await ctx.params;
    const { user } = await requireUser({ role: "creator" });
    return deleteRateCard({ db: asWriteDb(createAdminClient()), userId: user.id }, ids);
  })(request);
}
