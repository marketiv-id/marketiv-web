import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, readJsonBody } from "@/server/http";
import { deleteNotification, setNotificationRead } from "@/server/notifications/notifications";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** PATCH /api/notifications/[id] — `{ isRead }`. Hanya milik sendiri. */
export function PATCH(request: Request, context: Context) {
  return apiRoute("notifications.patch", async () => {
    const { id } = await context.params;
    const { user } = await requireUser({ allowInactive: true });
    const body = await readJsonBody(request);
    return setNotificationRead({ db: createAdminClient(), userId: user.id }, id, body);
  })(request);
}

/** DELETE /api/notifications/[id]. Hanya milik sendiri. */
export function DELETE(request: Request, context: Context) {
  return apiRoute("notifications.delete", async () => {
    const { id } = await context.params;
    const { user } = await requireUser({ allowInactive: true });
    return deleteNotification({ db: createAdminClient(), userId: user.id }, id);
  })(request);
}
