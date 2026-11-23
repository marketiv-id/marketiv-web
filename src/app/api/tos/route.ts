import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, readJsonBody } from "@/server/http";
import { handleTos } from "@/server/tos/accept-tos";

export const dynamic = "force-dynamic";

/**
 * POST /api/tos — `{ action: "status" }` atau `{ action: "accept", tos_version }`.
 * Akun nonaktif tetap boleh (Function lama tidak memeriksa status).
 */
export const POST = apiRoute("tos", async (request) => {
  const { user } = await requireUser({ allowInactive: true });
  const body = await readJsonBody(request);
  return handleTos({ db: createAdminClient(), userId: user.id }, body);
});
