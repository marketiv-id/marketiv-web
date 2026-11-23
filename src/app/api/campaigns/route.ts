import { createCampaignDraft, createCampaignSchema } from "@/server/campaigns/create";
import { readBody, umkmWriteContext } from "@/server/campaigns/route-helpers";
import { apiRoute, json } from "@/server/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/campaigns — buat campaign draft (+ brief + aset) dalam satu
 * transaksi. Server memaksa status='draft', remaining_budget=0, umkm_id=sesi.
 */
export const POST = apiRoute("campaigns.create", async (request) => {
  const ctx = await umkmWriteContext();
  const body = await readBody(request, createCampaignSchema);
  return json(await createCampaignDraft(ctx, body), 201);
});
