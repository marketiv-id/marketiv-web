import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, parseBody, readJsonBody } from "@/server/http";
import { deleteRateCard, setRateCardStatus } from "@/server/rate-cards/rate-cards";
import { asWriteDb, RATE_CARD_STATUSES } from "@/server/rate-cards/shared";

type Ctx = { params: Promise<{ rateCardId: string }> };

const statusSchema = z.object({
  status: z.enum(RATE_CARD_STATUSES, { error: "Status paket tidak valid." }),
  packageId: z.string({ error: "Paket wajib dipilih." }).min(1, "Paket wajib dipilih."),
});

/** PATCH /api/rate-cards/[rateCardId] — `{ status, packageId }` → `CreatorRateCardPackage`. */
export async function PATCH(request: Request, ctx: Ctx) {
  return apiRoute("rate-cards.status", async () => {
    const { rateCardId } = await ctx.params;
    const { user } = await requireUser({ role: "creator" });
    const body = parseBody(statusSchema, await readJsonBody(request), "Status paket tidak valid.");
    return setRateCardStatus({ db: asWriteDb(createAdminClient()), userId: user.id }, rateCardId, body);
  })(request);
}

/** DELETE /api/rate-cards/[rateCardId] — hapus rate card + paketnya (409 bila ada order berjalan). */
export async function DELETE(request: Request, ctx: Ctx) {
  return apiRoute("rate-cards.delete", async () => {
    const { rateCardId } = await ctx.params;
    const { user } = await requireUser({ role: "creator" });
    return deleteRateCard({ db: asWriteDb(createAdminClient()), userId: user.id }, { rateCardId });
  })(request);
}
