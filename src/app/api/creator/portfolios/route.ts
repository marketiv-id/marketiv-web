import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { createPortfolio, portfolioWriteSchema } from "@/server/creator/writes/portfolios";
import { apiRoute, json, parseBody, readJsonBody } from "@/server/http";
import { asWriteDb } from "@/server/rate-cards/shared";

/** POST /api/creator/portfolios — tambah portofolio. → 201 `CreatorPortfolioItem`. */
export const POST = apiRoute("creator.portfolios.create", async (request) => {
  const { user } = await requireUser({ role: "creator" });
  const body = parseBody(portfolioWriteSchema, await readJsonBody(request), "Data portofolio tidak valid.");
  return json(await createPortfolio({ db: asWriteDb(createAdminClient()), userId: user.id }, body), 201);
});
