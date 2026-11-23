import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, json, parseBody, readJsonBody } from "@/server/http";
import { createRateCardPackage } from "@/server/rate-cards/rate-cards";
import { asWriteDb, rateCardWriteSchema } from "@/server/rate-cards/shared";

type Ctx = { params: Promise<{ rateCardId: string }> };

/** POST /api/rate-cards/[rateCardId]/packages — tambah paket ke rate card milik sendiri. → 201. */
export async function POST(request: Request, ctx: Ctx) {
  return apiRoute("rate-cards.packages.create", async () => {
    const { rateCardId } = await ctx.params;
    const { user } = await requireUser({ role: "creator" });
    const body = parseBody(rateCardWriteSchema, await readJsonBody(request), "Data paket tidak valid.");
    const dto = await createRateCardPackage({ db: asWriteDb(createAdminClient()), userId: user.id }, rateCardId, body);
    return json(dto, 201);
  })(request);
}
