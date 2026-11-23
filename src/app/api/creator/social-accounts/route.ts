import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { socialAccountWriteSchema, upsertSocialAccount } from "@/server/creator/writes/social-accounts";
import { apiRoute, parseBody, readJsonBody } from "@/server/http";
import { asWriteDb } from "@/server/rate-cards/shared";

/** PUT /api/creator/social-accounts — upsert pada `(creator_id, platform)`. */
export const PUT = apiRoute("creator.social-accounts.upsert", async (request) => {
  const { user } = await requireUser({ role: "creator" });
  const body = parseBody(socialAccountWriteSchema, await readJsonBody(request), "Data akun sosial tidak valid.");
  return upsertSocialAccount({ db: asWriteDb(createAdminClient()), userId: user.id }, body);
});
