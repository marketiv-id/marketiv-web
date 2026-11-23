import { createAdminClient } from "@/lib/supabase/admin";
import { briefSchema, generateCampaignBrief } from "@/server/ai/brief";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, parseBody, readJsonBody } from "@/server/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/brief — brief campaign dari AI (port `ai-brief`).
 * User dari sesi; `campaignId` (opsional) wajib milik user (celah #4).
 * Tanpa kredensial AI → 503.
 */
export const POST = apiRoute("ai.brief", async (request) => {
  const { user } = await requireUser({ role: "umkm" });
  const body = parseBody(briefSchema, await readJsonBody(request), "Data brief tidak valid.");
  return generateCampaignBrief({ db: createAdminClient(), userId: user.id }, body);
});
