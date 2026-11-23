import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { getCreatorProfile } from "@/server/creator/profile";
import { asReadDb } from "@/server/creator/shared";
import { apiRoute } from "@/server/http";

/** GET /api/creator/profile — `CreatorProfile` milik kreator yang login (tanpa parameter). */
export const GET = apiRoute("creator.profile", async () => {
  const { user } = await requireUser({ role: "creator" });
  return getCreatorProfile({ db: asReadDb(createAdminClient()), user });
});
