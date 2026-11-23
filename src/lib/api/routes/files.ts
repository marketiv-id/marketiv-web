import type { ApiRoute } from "./types";

/** Fase 6: upload langsung ke Supabase Storage lewat signed URL. */
export const FILE_ROUTES = {
  createUploadUrl: { method: "POST", path: "/api/files/upload-url" },
  confirmUpload: { method: "POST", path: "/api/files/confirm" },
  deleteUserFile: { method: "DELETE", path: "/api/files/:fileId" },
  getUserFileUrl: { method: "GET", path: "/api/files/:fileId/url" },
} as const satisfies Record<string, ApiRoute>;
