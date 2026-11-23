import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { getCreatorNegotiation, listCreatorNegotiations } from "@/server/creator/negotiations";
import { asReadDb } from "@/server/creator/shared";
import { apiRoute, parseQuery } from "@/server/http";

const querySchema = z.object({
  conversationId: z.string().trim().max(255, "conversationId tidak valid.").optional(),
});

/**
 * GET /api/creator/negotiations[?conversationId=…]
 * Tanpa parameter → `CreatorNegotiation[]`; dengan conversationId → satu objek (404 bila bukan milik kreator).
 */
export const GET = apiRoute("creator.negotiations", async (request) => {
  const { user } = await requireUser({ role: "creator" });
  const { conversationId } = parseQuery(querySchema, request);
  const db = asReadDb(createAdminClient());
  return conversationId
    ? getCreatorNegotiation({ db, userId: user.id, conversationId })
    : listCreatorNegotiations({ db, userId: user.id });
});
