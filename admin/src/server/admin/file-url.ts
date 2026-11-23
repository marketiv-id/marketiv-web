import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";

import { HttpError, throwIfDbError } from "../http";

/**
 * File privat (bucket `user-files`) untuk Admin.
 *
 * `deliverables.file_url` berisi URL STABIL app user
 * `<origin-app-user>/api/files/<user_files.id>/url?redirect=1`. Admin login di
 * domain lain, jadi link itu menjawab 401. `toAdminFileUrl()` menulis ulang
 * link tersebut ke `/api/admin/files/<id>/url?redirect=1` (same-origin admin);
 * URL lain (eksternal, Appwrite lama) dibiarkan apa adanya.
 */

const SIGNED_URL_TTL_SECONDS = 300;
const USER_FILE_PATH = /^\/api\/files\/([^/]+)\/url\/?$/;

export function toAdminFileUrl(url: string): string {
  if (!url) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return url;
  const match = USER_FILE_PATH.exec(parsed.pathname);
  if (!match) return url;
  const fileId = decodeURIComponent(match[1]);
  if (!fileId || fileId.length > 255) return url;
  return `/api/admin/files/${encodeURIComponent(fileId)}/url?redirect=1`;
}

export interface AdminSignedFileUrl {
  url: string;
  expiresIn: number;
  fileName: string;
  mimeType: string;
}

export async function getAdminFileSignedUrl(db: AdminSupabaseClient, fileId: string): Promise<AdminSignedFileUrl> {
  if (!fileId || fileId.length > 255) throw new HttpError(400, "File tidak valid.");
  const { data: file, error } = await db
    .from("user_files")
    .select("id, bucket_id, storage_file_id, file_name, mime_type, status")
    .eq("id", fileId)
    .maybeSingle();
  throwIfDbError(error);
  if (!file || file.status !== "active") throw new HttpError(404, "File tidak ditemukan.");

  const { data: signed, error: signError } = await db.storage
    .from(file.bucket_id)
    .createSignedUrl(file.storage_file_id, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    // Objek hilang di Storage → 404; lainnya 500 (detail di log server).
    const status = (signError as { statusCode?: string | number } | null)?.statusCode;
    if (String(status) === "404" || /not.?found/i.test(signError?.message ?? "")) {
      throw new HttpError(404, "File tidak ditemukan.");
    }
    throw new Error(`[storage] createSignedUrl gagal: ${signError?.message ?? "tanpa URL"}`);
  }
  return { url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS, fileName: file.file_name, mimeType: file.mime_type };
}
