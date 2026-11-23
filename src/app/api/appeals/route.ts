import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, json, readJsonBody } from "@/server/http";
import { createAppeal } from "@/server/appeals/create-appeal";

export const dynamic = "force-dynamic";

/** POST /api/appeals — banding akun nonaktif (pengganti Function create-appeal). */
export const POST = apiRoute("appeals.create", async (request) => {
  const { user } = await requireUser({ allowInactive: true });
  const body = await readJsonBody(request);
  return json(await createAppeal({ db: createAdminClient(), userId: user.id }, body), 201);
});
