import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { deleteSocialAccount } from "@/server/creator/writes/social-accounts";
import { apiRoute } from "@/server/http";
import { asWriteDb } from "@/server/rate-cards/shared";

type Ctx = { params: Promise<{ accountId: string }> };

/** DELETE /api/creator/social-accounts/[accountId] (404 bila bukan milik sendiri). */
export async function DELETE(request: Request, ctx: Ctx) {
  return apiRoute("creator.social-accounts.delete", async () => {
    const { accountId } = await ctx.params;
    const { user } = await requireUser({ role: "creator" });
    return deleteSocialAccount({ db: asWriteDb(createAdminClient()), userId: user.id }, accountId);
  })(request);
}
