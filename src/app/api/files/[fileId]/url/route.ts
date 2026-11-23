import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser, requireUser } from "@/server/auth/require-user";
import { getUserFileSignedUrl } from "@/server/files/signed-url";
import { apiRoute, HttpError } from "@/server/http";

type Params = { params: Promise<{ fileId: string }> };

export const dynamic = "force-dynamic";

/**
 * GET /api/files/[fileId]/url → `{ url, expiresIn, fileName, mimeType }`
 * GET /api/files/[fileId]/url?redirect=1 → 302 ke signed URL.
 *
 * Bentuk `?redirect=1` adalah URL STABIL yang disimpan sebagai `fileUrl`
 * (mis. `deliverables.file_url`): link bisa dibuka kapan saja oleh pihak yang
 * berhak, signed URL-nya dibuat baru setiap kali (berlaku 5 menit).
 */
export function GET(request: Request, { params }: Params) {
  return apiRoute("files.url", async () => {
    const { user, userRow } = await requireUser();
    const { fileId } = await params;
    if (!fileId || fileId.length > 255) throw new HttpError(400, "File tidak valid.");
    const result = await getUserFileSignedUrl(
      { db: createAdminClient(), userId: user.id, isAdmin: isAdminUser(user, userRow) },
      fileId,
    );
    if (new URL(request.url).searchParams.get("redirect") === "1") {
      const res = NextResponse.redirect(result.url, 302);
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
    return result;
  })(request);
}
