import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, readJsonBody } from "@/server/http";
import { setConversationArchived } from "@/server/conversations/conversations";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ conversationId: string }> };

/** PATCH /api/conversations/[conversationId]/archive — `{ isArchived }`. */
export function PATCH(request: Request, context: Context) {
  return apiRoute("conversations.archive", async () => {
    const { conversationId } = await context.params;
    const { user } = await requireUser({ allowInactive: true });
    const body = await readJsonBody(request);
    return setConversationArchived({ db: createAdminClient(), userId: user.id }, conversationId, body);
  })(request);
}
