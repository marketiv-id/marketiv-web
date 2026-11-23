import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { createUserFileUploadUrl } from "@/server/files/upload-url";
import { apiRoute, parseBody, readJsonBody } from "@/server/http";

const bodySchema = z.object({
  fileName: z.string().trim().min(1, "Nama file wajib diisi.").max(255, "Nama file terlalu panjang."),
  mimeType: z.string().trim().min(1, "Tipe file wajib diisi.").max(100, "Tipe file tidak valid."),
  sizeBytes: z.number({ error: "Ukuran file tidak valid." }).int("Ukuran file tidak valid.").positive("Berkas kosong."),
});

/**
 * POST /api/files/upload-url — `{ fileName, mimeType, sizeBytes }`
 * → `{ bucketId, path, token }` untuk `storage.uploadToSignedUrl()`.
 * Pengganti langkah validasi `validate-and-upload` (berkas tidak lewat route).
 */
export const POST = apiRoute("files.upload-url", async (request) => {
  const { user } = await requireUser();
  const body = await readJsonBody(request);
  const input = parseBody(bodySchema, body, "Data file tidak valid.");
  return createUserFileUploadUrl({ db: createAdminClient(), userId: user.id }, input);
});
