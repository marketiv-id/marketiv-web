import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, readJsonBody } from "@/server/http";
import { updateProfile } from "@/server/profile/update-profile";

export const dynamic = "force-dynamic";

/** PATCH /api/profile — pengganti Function update-profile (UMKM & kreator). */
export const PATCH = apiRoute("profile.update", async (request) => {
  const { user, userRow } = await requireUser();
  const body = await readJsonBody(request);
  return updateProfile({ db: createAdminClient(), userId: user.id, role: userRow.role }, body);
});
