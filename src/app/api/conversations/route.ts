import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, readJsonBody } from "@/server/http";
import { createConversation } from "@/server/conversations/conversations";

export const dynamic = "force-dynamic";

/** POST /api/conversations — `{ creatorId }` → `{ conversationId }`. Hanya UMKM aktif. */
export const POST = apiRoute("conversations.create", async (request) => {
  const { user } = await requireUser({
    role: "umkm",
    messages: {
      notFound: "Profil Pengguna tidak ditemukan.",
      inactive: "Akun Anda sedang tidak aktif.",
      wrongRole: "Hanya UMKM yang dapat memulai percakapan.",
    },
  });
  const body = await readJsonBody(request);
  return createConversation({ db: createAdminClient(), userId: user.id }, body);
});
