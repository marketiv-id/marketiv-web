import type { ApiRoute } from "./types";

/** Fase 6: profil, ToS, banding, notifikasi, chat. */
export const ACCOUNT_ROUTES = {
  updateProfile: { method: "PATCH", path: "/api/profile" },
  acceptTos: { method: "POST", path: "/api/tos" },
  createAppeal: { method: "POST", path: "/api/appeals" },
  markNotificationsRead: { method: "PATCH", path: "/api/notifications/read" },
  updateNotification: { method: "PATCH", path: "/api/notifications/:id" },
  deleteNotification: { method: "DELETE", path: "/api/notifications/:id" },
  createConversation: { method: "POST", path: "/api/conversations" },
  sendMessage: { method: "POST", path: "/api/conversations/:conversationId/messages" },
  markConversationRead: { method: "POST", path: "/api/conversations/:conversationId/read" },
  patchConversationArchive: { method: "PATCH", path: "/api/conversations/:conversationId/archive" },
} as const satisfies Record<string, ApiRoute>;
