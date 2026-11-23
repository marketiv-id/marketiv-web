import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, parseQuery } from "@/server/http";
import { getUmkmNegotiations } from "@/server/umkm/negotiations";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  conversationId: z.string().trim().max(255, "Conversation ID tidak valid.").optional(),
});

/**
 * GET /api/umkm/negotiations[?conversationId=…] — pengganti Function
 * get-umkm-negotiations. Tanpa conversationId → daftar; dengan → satu objek.
 */
export const GET = apiRoute("umkm.negotiations", async (request) => {
  const { user } = await requireUser({ role: "umkm" });
  const { conversationId } = parseQuery(querySchema, request);
  return getUmkmNegotiations({ db: createAdminClient(), userId: user.id }, conversationId || null);
});
