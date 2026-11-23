import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { getCreatorDirectoryEntry, getCreatorDirectoryPage } from "@/server/creator/directory";
import { asReadDb } from "@/server/creator/shared";
import { apiRoute, parseQuery } from "@/server/http";

const querySchema = z.object({
  creatorId: z.string().trim().max(255, "creatorId tidak valid.").optional(),
  limit: z.coerce.number({ error: "limit harus berupa angka." }).optional(),
  cursor: z.string().trim().max(255, "cursor tidak valid.").optional(),
});

/**
 * GET /api/creator/directory?creatorId=… → satu `CreatorProfile` (404 bila tidak ada)
 * GET /api/creator/directory?limit=&cursor= → `PaginatedCreators`
 *
 * Function lama menerima sesi apa pun; sekarang wajib baris `users` aktif
 * (role apa pun). Pemanggil di app: UMKM.
 */
export const GET = apiRoute("creator.directory", async (request) => {
  await requireUser();
  const { creatorId, limit, cursor } = parseQuery(querySchema, request);
  const db = asReadDb(createAdminClient());
  return creatorId
    ? getCreatorDirectoryEntry({ db, creatorId })
    : getCreatorDirectoryPage({ db, limit, cursor: cursor || null });
});
