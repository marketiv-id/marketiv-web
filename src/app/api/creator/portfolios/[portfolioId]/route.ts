import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { deletePortfolio, portfolioWriteSchema, updatePortfolio } from "@/server/creator/writes/portfolios";
import { apiRoute, parseBody, readJsonBody } from "@/server/http";
import { asWriteDb } from "@/server/rate-cards/shared";

type Ctx = { params: Promise<{ portfolioId: string }> };

/** PATCH /api/creator/portfolios/[portfolioId] → `CreatorPortfolioItem` (404 bila bukan milik sendiri). */
export async function PATCH(request: Request, ctx: Ctx) {
  return apiRoute("creator.portfolios.update", async () => {
    const { portfolioId } = await ctx.params;
    const { user } = await requireUser({ role: "creator" });
    const body = parseBody(portfolioWriteSchema, await readJsonBody(request), "Data portofolio tidak valid.");
    return updatePortfolio({ db: asWriteDb(createAdminClient()), userId: user.id }, portfolioId, body);
  })(request);
}

/** DELETE /api/creator/portfolios/[portfolioId] (404 bila bukan milik sendiri). */
export async function DELETE(request: Request, ctx: Ctx) {
  return apiRoute("creator.portfolios.delete", async () => {
    const { portfolioId } = await ctx.params;
    const { user } = await requireUser({ role: "creator" });
    return deletePortfolio({ db: asWriteDb(createAdminClient()), userId: user.id }, portfolioId);
  })(request);
}
