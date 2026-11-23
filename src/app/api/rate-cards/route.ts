import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, json, parseBody, readJsonBody } from "@/server/http";
import { createRateCard } from "@/server/rate-cards/rate-cards";
import { asWriteDb, rateCardWriteSchema } from "@/server/rate-cards/shared";

/** POST /api/rate-cards — buat rate card + paket (maks 3 per kreator). → 201 `CreatorRateCardPackage`. */
export const POST = apiRoute("rate-cards.create", async (request) => {
  const { user } = await requireUser({ role: "creator" });
  const body = parseBody(rateCardWriteSchema, await readJsonBody(request), "Data paket tidak valid.");
  return json(await createRateCard({ db: asWriteDb(createAdminClient()), userId: user.id }, body), 201);
});
