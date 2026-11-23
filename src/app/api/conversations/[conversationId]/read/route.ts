import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute } from "@/server/http";
import { markConversationRead } from "@/server/conversations/conversations";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ conversationId: string }> };

/** POST /api/conversations/[conversationId]/read → `{ ok, updated }`. */
export function POST(request: Request, context: Context) {
  return apiRoute("conversations.read", async () => {
    const { conversationId } = await context.params;
    const { user } = await requireUser({ allowInactive: true });
    return markConversationRead({ db: createAdminClient(), userId: user.id }, conversationId);
  })(request);
}
