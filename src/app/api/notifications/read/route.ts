import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, readJsonBody } from "@/server/http";
import { markNotificationsRead } from "@/server/notifications/notifications";

export const dynamic = "force-dynamic";

/** PATCH /api/notifications/read — `{ ids }` → `{ ok, updated }`. */
export const PATCH = apiRoute("notifications.read", async (request) => {
  const { user } = await requireUser({ allowInactive: true });
  const body = await readJsonBody(request);
  return markNotificationsRead({ db: createAdminClient(), userId: user.id }, body);
});
