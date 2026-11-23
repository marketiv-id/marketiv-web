import { NextResponse } from "next/server";

import { getAdminFileSignedUrl } from "@/server/admin/file-url";
import { apiRoute } from "@/server/http";
import { requireAdmin } from "@/server/require-admin";

type Params = { params: Promise<{ fileId: string }> };

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/files/[fileId]/url → `{ url, expiresIn, fileName, mimeType }`
 * GET /api/admin/files/[fileId]/url?redirect=1 → 302 ke signed URL (5 menit).
 *
 * Padanan `/api/files/[id]/url` app user untuk domain admin (sesi app user
 * tidak berlaku di sini). Admin aktif boleh membuka file privat mana pun.
 */
export function GET(request: Request, { params }: Params) {
  return apiRoute("admin.files.url", async () => {
    const { db } = await requireAdmin();
    const { fileId } = await params;
    const result = await getAdminFileSignedUrl(db, fileId);
    if (new URL(request.url).searchParams.get("redirect") === "1") {
      const res = NextResponse.redirect(result.url, 302);
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
    return result;
  })(request);
}
