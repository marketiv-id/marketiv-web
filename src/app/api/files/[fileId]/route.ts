import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { deleteUserFile } from "@/server/files/delete";
import { apiRoute, HttpError } from "@/server/http";

type Params = { params: Promise<{ fileId: string }> };

/** DELETE /api/files/[fileId] — hapus file privat milik sendiri (port `delete-file`). */
export function DELETE(request: Request, { params }: Params) {
  return apiRoute("files.delete", async () => {
    const { user } = await requireUser();
    const { fileId } = await params;
    if (!fileId || fileId.length > 255) throw new HttpError(400, "File tidak valid.");
    return deleteUserFile({ db: createAdminClient(), userId: user.id }, fileId);
  })(request);
}
