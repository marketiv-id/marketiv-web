import "server-only";

import { z } from "zod";

import type { ChatMessage } from "@/types/umkm-dashboard.types";
import { HttpError, parseBody } from "@/server/http";

import { callWriteRpc, type WriteDb } from "./write-rpc";

/**
 * Tulis chat — pengganti Function create-conversation, send-message (+ notifikasi
 * in-app pengganti send-chat-notification), mark-conversation-read, dan
 * patch-conversation-archive. Cek peserta dilakukan RPC; bukan peserta → 404
 * (tidak membocorkan keberadaan percakapan orang lain).
 */

/** Batas kolom `messages.content`. */
export const MAX_MESSAGE_LENGTH = 2000;

const conversationIdSchema = z.string().trim().min(1).max(255);

function conversationId(raw: string): string {
  const parsed = conversationIdSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, "Percakapan tidak ditemukan.");
  return parsed.data;
}

const createSchema = z.object({
  creatorId: z
    .string({ error: "Kreator tidak valid." })
    .trim()
    .min(1, "Kreator tidak valid.")
    .uuid("Profil kreator ini belum tertaut ke akun yang sah."),
});

const messageSchema = z.object({
  content: z
    .string({ error: "Pesan tidak boleh kosong." })
    .trim()
    .min(1, "Pesan tidak boleh kosong.")
    .max(MAX_MESSAGE_LENGTH, `Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.`),
});

const archiveSchema = z.object({
  isArchived: z.boolean({ error: "isArchived wajib boolean." }),
});

/** POST /api/conversations — `{ creatorId }` → `{ conversationId }` (idempoten). */
export async function createConversation(ctx: { db: WriteDb; userId: string }, body: unknown) {
  const { creatorId } = parseBody(createSchema, body, "Kreator tidak valid.");
  if (creatorId === ctx.userId) {
    throw new HttpError(400, "Tidak bisa memulai percakapan dengan diri sendiri.");
  }
  const id = await callWriteRpc<string | null>(ctx.db, "create_conversation", {
    p_umkm_id: ctx.userId,
    p_creator_id: creatorId,
  });
  if (!id) throw new HttpError(500, "Ruang negosiasi gagal dibuka.", "server");
  return { conversationId: id };
}

/** POST /api/conversations/[id]/messages — `{ content }` → ChatMessage. */
export async function sendMessage(
  ctx: { db: WriteDb; userId: string },
  rawConversationId: string,
  body: unknown,
): Promise<ChatMessage> {
  const id = conversationId(rawConversationId);
  const { content } = parseBody(messageSchema, body, "Pesan tidak valid.");
  return callWriteRpc<ChatMessage>(ctx.db, "send_message", {
    p_sender_id: ctx.userId,
    p_conversation_id: id,
    p_content: content,
  });
}

/** POST /api/conversations/[id]/read → `{ ok, updated }` (satu UPDATE). */
export async function markConversationRead(ctx: { db: WriteDb; userId: string }, rawConversationId: string) {
  const id = conversationId(rawConversationId);
  const updated = await callWriteRpc<number>(ctx.db, "mark_conversation_read", {
    p_user_id: ctx.userId,
    p_conversation_id: id,
  });
  return { ok: true as const, updated: Number(updated) || 0 };
}

/** PATCH /api/conversations/[id]/archive — `{ isArchived }` → `{ ok, conversationId, isArchived }`. */
export async function setConversationArchived(
  ctx: { db: WriteDb; userId: string },
  rawConversationId: string,
  body: unknown,
) {
  const id = conversationId(rawConversationId);
  const { isArchived } = parseBody(archiveSchema, body, "isArchived wajib boolean.");
  return callWriteRpc<{ ok: true; conversationId: string; isArchived: boolean }>(
    ctx.db,
    "set_conversation_archived",
    { p_user_id: ctx.userId, p_conversation_id: id, p_archived: isArchived },
  );
}
