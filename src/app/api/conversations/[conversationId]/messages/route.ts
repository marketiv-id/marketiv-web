import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, json, readJsonBody } from "@/server/http";
import { sendMessage } from "@/server/conversations/conversations";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ conversationId: string }> };

/** POST /api/conversations/[conversationId]/messages — `{ content }` → ChatMessage. */
export function POST(request: Request, context: Context) {
  return apiRoute("conversations.messages", async () => {
    const { conversationId } = await context.params;
    const { user } = await requireUser({ role: ["umkm", "creator"] });
    const body = await readJsonBody(request);
    return json(await sendMessage({ db: createAdminClient(), userId: user.id }, conversationId, body), 201);
  })(request);
}
