import type { ChatMessage } from "@/types/umkm-dashboard.types";

/**
 * Riwayat pesan per conversationId untuk ruang negosiasi SISI KREATOR.
 *
 * Harus konsisten dengan `mockCreatorNegotiations` di `creator-dashboard.mock.ts`
 * (brand dan lawan bicara yang sama per ruang). Jangan memakai `mockChatMessages`
 * milik UMKM: id ruangnya bertabrakan, tetapi isinya milik dunia berbeda.
 *
 * Kreator pada seluruh ruang ini adalah `mockCreatorProfile.id` = `creator_002`.
 */
export const mockCreatorMessages: Record<string, ChatMessage[]> = {
  conv_001: [
    {
      id: "cmsg_001_1",
      conversationId: "conv_001",
      senderId: "umkm_002",
      senderRole: "umkm",
      type: "text",
      content:
        "Halo Kak Dimas, kami dari Batik Cantik Solo ingin mengajak kolaborasi Collab Post Batik Outer Cap. Apakah slotnya masih ada?",
      isRead: true,
      createdAt: "2026-06-05T08:00:00.000Z",
    },
    {
      id: "cmsg_001_2",
      conversationId: "conv_001",
      senderId: "creator_002",
      senderRole: "creator",
      type: "text",
      content:
        "Halo kak, slotnya masih ada. Untuk 3 video reels mix-and-match saya siapkan konsep styling yang menonjolkan detail cantingnya ya.",
      isRead: true,
      createdAt: "2026-06-05T08:20:00.000Z",
    },
    {
      id: "cmsg_001_3",
      conversationId: "conv_001",
      senderId: "umkm_002",
      senderRole: "umkm",
      type: "system",
      content: "UMKM Batik Cantik Solo mengirim Custom Offer Rp 750.000 untuk 3 video reels.",
      isRead: false,
      createdAt: "2026-06-05T09:00:00.000Z",
    },
  ],
  conv_002: [
    {
      id: "cmsg_002_1",
      conversationId: "conv_002",
      senderId: "umkm_003",
      senderRole: "umkm",
      type: "text",
      content:
        "Kak Dimas, produk serum kami baru rilis. Bisa dibuat review jujur dengan fokus tekstur dan hasil setelah 7 hari pemakaian?",
      isRead: true,
      createdAt: "2026-06-04T10:00:00.000Z",
    },
    {
      id: "cmsg_002_2",
      conversationId: "conv_002",
      senderId: "creator_002",
      senderRole: "creator",
      type: "text",
      content:
        "Bisa kak. Saya akan tampilkan tetesannya, cara pakai, lalu before-after pemakaian seminggu. Revisi minor 2 kali ya.",
      isRead: true,
      createdAt: "2026-06-04T10:25:00.000Z",
    },
  ],
  conv_003: [
    {
      id: "cmsg_003_1",
      conversationId: "conv_003",
      senderId: "umkm_004",
      senderRole: "umkm",
      type: "text",
      content:
        "Halo Kak, menu kopi aren baru kami cocok dibuat video kuliner dengan vibe home cafe. Bisa dibantu?",
      isRead: true,
      createdAt: "2026-06-03T13:00:00.000Z",
    },
    {
      id: "cmsg_003_2",
      conversationId: "conv_003",
      senderId: "creator_002",
      senderRole: "creator",
      type: "text",
      content:
        "Siap kak, saya rekam proses penyajian lalu close-up tekstur arennya. Estimasi pengerjaan 7 hari ya.",
      isRead: true,
      createdAt: "2026-06-03T13:30:00.000Z",
    },
  ],
  conv_004: [
    {
      id: "cmsg_004_1",
      conversationId: "conv_004",
      senderId: "umkm_005",
      senderRole: "umkm",
      type: "text",
      content:
        "Kak Dimas, kami ingin showcase daily hijab jersey premium. Konsepnya tutorial mix and match untuk kegiatan harian.",
      isRead: true,
      createdAt: "2026-06-02T09:00:00.000Z",
    },
    {
      id: "cmsg_004_2",
      conversationId: "conv_004",
      senderId: "creator_002",
      senderRole: "creator",
      type: "text",
      content:
        "Noted kak. Saya siapkan 3 look dalam satu video supaya penonton bisa lihat variasi pemakaiannya.",
      isRead: false,
      createdAt: "2026-06-02T09:15:00.000Z",
    },
  ],
};
