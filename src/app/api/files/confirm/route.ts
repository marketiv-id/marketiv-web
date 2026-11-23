import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { confirmUserFileUpload } from "@/server/files/confirm";
import { apiRoute, json, parseBody, readJsonBody } from "@/server/http";

const bodySchema = z.object({
  path: z.string().trim().min(1, "Path file wajib diisi.").max(255, "Path file tidak valid."),
  fileName: z.string().trim().min(1, "Nama file wajib diisi.").max(255, "Nama file terlalu panjang."),
  shareWithOrderId: z.string().trim().max(255, "Order tidak valid.").optional(),
});

/**
 * POST /api/files/confirm — `{ path, fileName, shareWithOrderId? }`
 * → 201 `{ status: "ok", file }`. Catat `user_files` + debit kuota (atomik).
 * Kuota penuh / batas file → 409 (objek yang terunggah dihapus).
 */
export const POST = apiRoute("files.confirm", async (request) => {
  const { user } = await requireUser();
  const body = await readJsonBody(request);
  const input = parseBody(bodySchema, body, "Data file tidak valid.");
  const result = await confirmUserFileUpload({ db: createAdminClient(), userId: user.id }, input);
  return json(result, 201);
});
