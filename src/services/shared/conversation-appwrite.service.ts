import { callApi } from "@/lib/api/call-api";
import { createClient } from "@/lib/supabase/client";
import { rowToDoc, rowsToDocs } from "@/services/shared/legacy-doc";
import type { ServiceResult } from "@/types/domain";
import type { ChatMessage } from "@/types/umkm-dashboard.types";
import {
  type Doc,
  str,
  num,
  ok,
  fail,
  failFromError,
  failFromWriteError,
  requireUserId,
} from "@/services/shared/service-result";

/**
 * Percakapan & pesan — dipakai dashboard UMKM maupun Kreator.
 *
 * Ditaruh di `shared/` karena logikanya identik untuk kedua role: `conversations`
 * di-scope per pasangan peserta, bukan per peran. Menyalinnya ke dua service
 * domain akan mengulang bug yang sama dua kali.
 *
 * Mirror 00_BACKEND/src/services/chat.service.ts.
 *
 * ⚠️ SNAKE_CASE. `conversations` dan `messages` adalah satu-satunya collection
 * di seluruh skema yang memakai snake_case (`umkm_id`, `creator_id`,
 * `last_message`, `conversation_id`, `sender_id`, `message_type`, `read_at`).
 * Jangan menyalin pola camelCase dari service lain ke sini.
 *
 * TULIS lewat Route Handler (Fase 6): buat percakapan, kirim pesan, tandai
 * dibaca, arsip → `callApi(...)` → RPC Postgres yang memeriksa peserta di
 * server. Browser tidak pernah menulis `conversations`/`messages` langsung
 * (RLS hanya memberi SELECT). BACA lewat supabase-js + RLS
 * (`private.is_conversation_participant`).
 */

const CONVERSATIONS = "conversations";
const MESSAGES = "messages";
const OFFERS = "offers";

/**
 * Batas kolom `messages.content` (0005_ratecards_chat.sql).
 *
 * Dipakai untuk menolak lebih awal supaya pengguna tidak menunggu satu request
 * hanya untuk ditolak. Batas yang MENGIKAT ada di route + RPC `send_message` —
 * pemeriksaan di klien tidak pernah jadi pengaman.
 */
const MAX_MESSAGE_LENGTH = 2000;

export type ConversationFlag = {
  id: string;
  umkmId: string;
  creatorId: string;
  isArchived: boolean;
};

const mapConversation = (d: Doc): ConversationFlag => ({
  id: str(d.$id),
  umkmId: str(d.umkm_id),
  creatorId: str(d.creator_id),
  isArchived: Boolean(d.is_archived),
});

/**
 * Kunci gabung daftar negosiasi ↔ percakapan. Satu percakapan per pasangan
 * (unique index `idx_umkm_creator`).
 *
 * Sejak DTO negosiasi di-key oleh conversationId dan membawa `isArchived`
 * sendiri, helper ini tidak lagi dibutuhkan untuk menggabungkan status arsip.
 * Dipertahankan karena masih berguna untuk deduplikasi sisi klien.
 */
export const conversationPairKey = (umkmId: string, creatorId: string): string =>
  `${umkmId}:${creatorId}`;

/** ID akun Supabase (UUID). Profil kreator lama tanpa akun tertaut ditolak lebih awal. */
const USER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Percakapan milik sesi aktif, apa pun perannya.
 *
 * Dua query lalu digabung, bukan `Query.or`: seseorang bisa berperan UMKM di
 * satu percakapan dan kreator di percakapan lain, dan `conversations` tidak
 * punya index gabungan untuk itu.
 */
export async function getMyConversationsFromAppwrite(): Promise<
  ServiceResult<ConversationFlag[]>
> {
  const auth = await requireUserId<ConversationFlag[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const supabase = createClient();
    const [asUmkm, asCreator] = await Promise.all([
      supabase.from(CONVERSATIONS).select("*").eq("umkm_id", auth.userId).limit(100),
      supabase.from(CONVERSATIONS).select("*").eq("creator_id", auth.userId).limit(100),
    ]);
    if (asUmkm.error) throw asUmkm.error;
    if (asCreator.error) throw asCreator.error;

    const byId = new Map<string, ConversationFlag>();
    for (const doc of rowsToDocs(CONVERSATIONS, [...(asUmkm.data ?? []), ...(asCreator.data ?? [])])) {
      const mapped = mapConversation(doc);
      byId.set(mapped.id, mapped);
    }
    return ok([...byId.values()]);
  } catch (err) {
    return failFromError<ConversationFlag[]>(err, []);
  }
}

/**
 * Mulai (atau lanjutkan) percakapan dengan seorang kreator. UMKM-only —
 * pemanggilnya selalu menjadi `umkm_id` (ditegakkan route).
 *
 * Idempoten: percakapan yang sudah ada untuk pasangan ini dikembalikan apa
 * adanya (unique `umkm_id, creator_id` + `on conflict do nothing` di RPC).
 */
export async function createConversationInAppwrite(
  creatorId: string
): Promise<ServiceResult<string>> {
  const auth = await requireUserId<string>("");
  if (!auth.ok) return auth.result;
  if (!creatorId) return fail("Kreator tidak valid.", "validation", "");
  if (creatorId === auth.userId) {
    return fail("Tidak bisa memulai percakapan dengan diri sendiri.", "validation", "");
  }
  if (!USER_UUID.test(creatorId)) {
    return fail("Profil kreator ini belum tertaut ke akun yang sah.", "validation", "");
  }

  try {
    const data = await callApi<{ conversationId?: string }>("createConversation", { creatorId });
    const conversationId = str(data?.conversationId);
    if (!conversationId) return fail("Ruang negosiasi gagal dibuka.", "server", "");
    return ok(conversationId);
  } catch (err) {
    return failFromWriteError<string>(err, "", undefined, "createConversation");
  }
}

type Participation = { umkmId: string; creatorId: string; role: "umkm" | "creator" };

function participationOf(doc: Doc, userId: string): Participation | null {
  const umkmId = str(doc.umkm_id);
  const creatorId = str(doc.creator_id);
  if (umkmId !== userId && creatorId !== userId) return null;
  return { umkmId, creatorId, role: umkmId === userId ? "umkm" : "creator" };
}

/**
 * Peserta percakapan (Supabase) + peran pemanggil, atau null bila bukan peserta
 * / tidak terbaca. RLS sudah menyembunyikan percakapan orang lain; cek peserta
 * eksplisit tetap dipasang (sama dengan versi Appwrite).
 */
async function loadParticipationFromSupabase(
  conversationId: string,
  userId: string
): Promise<Participation | null> {
  const { data, error } = await createClient()
    .from(CONVERSATIONS)
    .select("id, umkm_id, creator_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return participationOf(rowToDoc(CONVERSATIONS, data), userId);
}

/**
 * Kirim pesan teks → `POST /api/conversations/[id]/messages`.
 *
 * RPC `send_message` menyimpan pesan, memperbarui `conversations.last_message`,
 * dan membuat notifikasi in-app untuk lawan bicara dalam SATU transaksi.
 */
export async function sendMessageInAppwrite(
  conversationId: string,
  content: string
): Promise<ServiceResult<ChatMessage>> {
  const empty = null as unknown as ChatMessage;
  const auth = await requireUserId<ChatMessage>(empty);
  if (!auth.ok) return auth.result;

  const text = content.trim();
  if (!text) return fail("Pesan tidak boleh kosong.", "validation", empty);
  if (text.length > MAX_MESSAGE_LENGTH) {
    return fail(`Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.`, "validation", empty);
  }

  try {
    const message = await callApi<ChatMessage>("sendMessage", { conversationId, content: text });
    if (!message?.id) return fail("Pesan gagal terkirim.", "server", empty);
    return ok(message);
  } catch (err) {
    return failFromWriteError<ChatMessage>(err, empty, undefined, "sendMessage");
  }
}

/**
 * Riwayat pesan satu percakapan.
 *
 * MENGGANTIKAN `getMessagesByOrderIdFromAppwrite`, yang mengirim `orderId` ke
 * `Query.equal("conversation_id", …)` — kunci yang tidak akan pernah cocok,
 * sehingga chat UMKM selalu kosong.
 *
 * `senderRole` diturunkan dari peserta percakapan, bukan dari perbandingan
 * dengan sesi. Versi lama menandai setiap pesan lawan bicara sebagai "creator",
 * yang salah begitu pembacanya sendiri adalah kreator.
 *
 * Rincian offer di-join di sini: `messages` hanya menyimpan `offer_id`, jadi
 * tanpa join ini kartu offer di chat tidak punya harga maupun deadline untuk
 * ditampilkan. Satu query untuk seluruh percakapan, bukan satu per pesan.
 */
export async function getMessagesByConversationIdInAppwrite(
  conversationId: string
): Promise<ServiceResult<ChatMessage[]>> {
  const auth = await requireUserId<ChatMessage[]>([]);
  if (!auth.ok) return auth.result;
  try {
    const participation = await loadParticipationFromSupabase(conversationId, auth.userId);
    if (!participation) return fail("Percakapan tidak ditemukan.", "not_found", []);

    const supabase = createClient();
    const [messagesRes, offersRes] = await Promise.all([
      supabase
        .from(MESSAGES)
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200),
      supabase.from(OFFERS).select("*").eq("conversation_id", conversationId).limit(100),
    ]);
    if (messagesRes.error) throw messagesRes.error;
    if (offersRes.error) throw offersRes.error;

    const offerById = new Map<string, Doc>(
      rowsToDocs(OFFERS, offersRes.data).map((o) => [str(o.$id), o])
    );

    const data: ChatMessage[] = rowsToDocs(MESSAGES, messagesRes.data).map((md) => {
      const senderId = str(md.sender_id);
      const type = str(md.message_type) || "text";
      const offer = str(md.offer_id) ? offerById.get(str(md.offer_id)) : undefined;

      return {
        id: str(md.$id),
        conversationId,
        senderId,
        senderRole:
          type === "system"
            ? "system"
            : senderId === participation.umkmId
              ? "umkm"
              : "creator",
        type: type as ChatMessage["type"],
        content: str(md.content),
        offerData: offer
          ? {
              offerId: str(offer.$id),
              title: str(offer.title) || str(offer.packageNameSnapshot),
              finalPrice: num(offer.price),
              scope: str(offer.description),
              deadline: str(offer.deadline),
              revisionCount: num(offer.revisionLimit),
            }
          : undefined,
        isRead: str(md.read_at) !== "",
        createdAt: str(md.$createdAt),
      };
    });
    return ok(data);
  } catch (err) {
    return failFromError<ChatMessage[]>(err, []);
  }
}

/**
 * Tandai pesan lawan bicara sebagai sudah dibaca.
 *
 * `messages.read_at` selalu ditulis `null` saat kirim dan TIDAK PERNAH diisi
 * oleh siapa pun — sementara `get-umkm-negotiations` dan
 * `get-creator-negotiations` menghitung `unreadCount` justru dari kolom itu.
 * Akibatnya badge belum-dibaca naik monoton dan tidak pernah turun walau
 * percakapannya sudah dibuka berkali-kali. Index `idx_read_at` sudah ada sejak
 * awal; yang hilang hanya penulisnya.
 *
 * Hanya pesan LAWAN BICARA yang ditandai — pesan sendiri tidak pernah dihitung
 * unread oleh kedua Function, jadi menandainya hanya menambah tulisan sia-sia.
 *
 * Server menjalankan SATU `UPDATE … WHERE read_at IS NULL` (RPC
 * `mark_conversation_read`), bukan loop per pesan. Pemanggil boleh mengabaikan
 * hasilnya: badge yang telat turun jauh lebih ringan daripada ruang chat yang
 * menolak terbuka.
 */
export async function markConversationReadInAppwrite(
  conversationId: string
): Promise<ServiceResult<number>> {
  const auth = await requireUserId<number>(0);
  if (!auth.ok) return auth.result;
  try {
    const res = await callApi<{ updated?: number }>("markConversationRead", { conversationId });
    return ok(num(res?.updated));
  } catch (err) {
    return failFromError<number>(err, 0, "markConversationRead");
  }
}

/**
 * Arsipkan / batal arsip. BUKAN hapus — pesan di dalamnya tetap utuh sebagai
 * riwayat negosiasi; yang berubah hanya visibilitas di inbox.
 */
export async function setConversationArchivedInAppwrite(
  conversationId: string,
  archived: boolean
): Promise<ServiceResult<null>> {
  const auth = await requireUserId<null>(null);
  if (!auth.ok) return auth.result;
  try {
    await callApi("patchConversationArchive", { conversationId, isArchived: archived });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, null);
  }
}
