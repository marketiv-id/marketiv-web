import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute } from "@/server/http";
import { getUmkmProfile } from "@/server/umkm/profile";

export const dynamic = "force-dynamic";

/** GET /api/umkm/profile — pengganti Function get-umkm-profile. */
export const GET = apiRoute("umkm.profile", async () => {
  const { user, userRow } = await requireUser({ role: "umkm" });
  return getUmkmProfile({ db: createAdminClient(), userId: user.id }, user, userRow);
});
