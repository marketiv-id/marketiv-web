"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { CreatorNegotiation } from "@/types/creator-dashboard";
import type { ChatMessage as ServiceChatMessage } from "@/types/umkm-dashboard.types";
import {
  getCreatorNegotiationById,
  getMessagesByConversationId,
  sendMessage,
  acceptOffer,
  rejectOffer,
} from "@/services/creator/creator-dashboard.service";
import { getDeliverables, uploadDeliverable } from "@/services/shared/deliverable.service";
import { markConversationRead } from "@/services/shared/conversation.service";
import { uploadUserFile, MAX_USER_FILE_BYTES } from "@/services/shared/user-file.service";
import type { Deliverable } from "@/types/umkm-dashboard.types";
import { toast } from "sonner";
import { CreatorEmptyState } from "./CreatorEmptyState";
import { CreatorPageSkeleton } from "./CreatorPageSkeleton";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { formatCurrency } from "@/lib/formatters";
import { PLATFORM_FEE_RATE, calculatePlatformFee } from "@/types/domain";
import { getEscrowStatusLabel } from "@/lib/creator-status";
import { cn } from "@/lib/utils";
import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";
import { realtimeClient, tableChannels } from "@/lib/appwrite/realtime";
import { useNegotiationRoomSync } from "@/lib/negotiation/use-negotiation-room-sync";
import { useTosConsent } from "@/components/providers/TosConsentProvider";
import {
  ArrowLeft,
  Send,
  Check,
  X,
  Lock,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Clock,
  CheckCircle2,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface NegosiasiRoomViewProps {
  /**
   * conversationId, bukan orderId. Ruang negosiasi hidup sejak percakapan
   * dimulai; order baru lahir setelah kreator menerima Custom Offer.
   */
  conversationId: string;
}

const CREATOR_ACTION_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-600), var(--color-kreator-action-end))";
const CREATOR_INK_ACTION_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-ink), var(--color-kreator-action-end))";
const CREATOR_PROGRESS_GRADIENT =
  "linear-gradient(90deg, var(--color-kreator-600), var(--color-kreator-action-end))";

type MessageSender = "umkm" | "creator" | "system";

/**
 * Bentuk tampilan pesan. `deliverables` dan `days` dibuang: keduanya tidak punya
 * kolom sumber di `offers` (yang ada `deadline` dan `revisionLimit`), jadi
 * sebelumnya hanya bisa diisi dari data karangan.
 */
interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  time: string;
  isCustomOffer?: boolean;
  offerData?: {
    offerId: string;
    title?: string;
    price: number;
    scope: string;
    revisions: number;
    deadline: string;
  };
}

// ─── Status config ────────────────────────────────────────────────────────────

// Key = NegotiationStage (lihat src/types/domain.ts) — mencakup tahap sebelum
// order ada, karena di Alur B order lahir paling akhir.
const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  chatting:        { dot: "bg-neutral-400", text: "text-neutral-600", bg: "bg-neutral-50", border: "border-neutral-200/60", label: "Negosiasi" },
  offer_pending:   { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200/60",   label: "Penawaran Masuk" },
  offer_rejected:  { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200/60",     label: "Penawaran Ditolak" },
  awaiting_order:  { dot: "bg-blue-400",    text: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200/60",    label: "Menyiapkan Pesanan" },
  pending_payment: { dot: "bg-blue-400",    text: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200/60",    label: "Menunggu Pembayaran" },
  escrow:          { dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200/60", label: "Escrow Aktif" },
  in_progress:     { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200/60",   label: "Sedang Dikerjakan" },
  revision:        { dot: "bg-orange-400",  text: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200/60",  label: "Revisi Diminta" },
  approved:        { dot: "bg-violet-400",  text: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200/60",  label: "Disetujui" },
  completed:       { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200/60", label: "Selesai" },
  cancelled:       { dot: "bg-neutral-400", text: "text-neutral-600", bg: "bg-neutral-50", border: "border-neutral-200/60", label: "Dibatalkan" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.chatting;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold border", s.text, s.bg, s.border)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NegosiasiRoomView({ conversationId }: NegosiasiRoomViewProps) {
  const { ensureCurrentConsent } = useTosConsent();
  const [neg, setNeg] = useState<CreatorNegotiation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const quickMenuRef = useRef<HTMLDivElement>(null);

  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isDeliverableModalOpen, setIsDeliverableModalOpen] = useState(false);
  const [deliverableMode, setDeliverableMode] = useState<"external_url" | "storage">("external_url");
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [deliverableFile, setDeliverableFile] = useState<File | null>(null);
  const [deliverableNotes, setDeliverableNotes] = useState("");
  const [deliverableError, setDeliverableError] = useState<string | null>(null);
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

  /**
   * Pesan nyata dipetakan ke bentuk lokal yang dipakai JSX di bawah.
   * `time` sengaja diturunkan dari `createdAt`, bukan disimpan sendiri —
   * seluruh riwayat chat sebelumnya adalah teks hardcode dengan jam palsu.
   */
  const toViewMessage = (m: ServiceChatMessage): ChatMessage => ({
    id: m.id,
    sender: m.senderRole,
    text: m.content,
    time: new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    isCustomOffer: m.type === "offer",
    offerData: m.offerData
      ? {
          offerId: m.offerData.offerId,
          title: m.offerData.title,
          price: m.offerData.finalPrice,
          scope: m.offerData.scope,
          revisions: m.offerData.revisionCount,
          deadline: m.offerData.deadline,
        }
      : undefined,
  });

  const loadRoom = useCallback(async () => {
    try {
      const [roomRes, msgRes] = await Promise.all([
        getCreatorNegotiationById(conversationId),
        getMessagesByConversationId(conversationId),
      ]);

      if (!roomRes.success) throw new Error(roomRes.error ?? "Gagal memuat data percakapan.");
      if (roomRes.data) setNeg(roomRes.data);

      if (msgRes.success && msgRes.data) setChatMessages(msgRes.data.map(toViewMessage));
      else if (!msgRes.success) console.error("Gagal muat pesan:", msgRes.error);

      // Deliverable hanya ada setelah order terbentuk — sebelum itu tidak ada
      // orderId untuk di-query, dan memanggilnya cuma menghasilkan 404.
      const orderId = roomRes.data?.orderId;
      if (orderId) {
        const dlvRes = await getDeliverables(orderId);
        if (dlvRes.success && dlvRes.data) setDeliverables(dlvRes.data);
      } else {
        setDeliverables([]);
      }

      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat ruang percakapan.");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    // Dibungkus supaya tidak ada setState yang terlihat sinkron di badan effect
    // (react-hooks/set-state-in-effect). Flag `active` mencegah penulisan state
    // setelah komponen di-unmount saat pengguna cepat berpindah ruang.
    let active = true;
    void (async () => {
      await loadRoom();
      if (!active) return;
      // Membuka ruang = pesannya terbaca. Tanpa ini `messages.read_at` tetap
      // kosong selamanya dan badge belum-dibaca tidak pernah turun. Sengaja
      // TIDAK di-await bersama loadRoom: kegagalannya tidak boleh menahan chat.
      void markConversationRead(conversationId);
    })();
    return () => {
      active = false;
    };
  }, [loadRoom, conversationId]);

  useNegotiationRoomSync({
    stage: neg?.stage,
    enabled: !DATA_SOURCE_CONFIG.useMockData,
    reload: loadRoom,
  });

  useEffect(() => {
    if (DATA_SOURCE_CONFIG.useMockData) return;
    const channels = tableChannels("messages");
    if (channels.length === 0) return;

    return realtimeClient.subscribe(channels, (event) => {
      const payload = event.payload as { conversation_id?: string };
      if (payload.conversation_id === conversationId) void loadRoom();
    });
  }, [conversationId, loadRoom]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    if (!isQuickMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target as Node)) {
        setIsQuickMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isQuickMenuOpen]);

  /**
   * Kirim pesan lalu muat ulang riwayatnya.
   *
   * Tidak ada balasan otomatis. Versi sebelumnya memunculkan jawaban UMKM palsu
   * setelah 1,5 detik — kreator mengira pesannya sudah dibaca orang.
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || sending) return;

    setSending(true);
    const res = await sendMessage(conversationId, text);
    setSending(false);
    if (!res.success) {
      toast.error(res.error ?? "Gagal mengirim pesan.");
      return;
    }
    setInputMessage("");
    await loadRoom();
  };

  /**
   * Terima / tolak Custom Offer — SATU-SATUNYA aksi kreator terhadap offer.
   * Membuat offer adalah hak UMKM (docs/02_Modules/Offers/30_Business_Rules.md:13),
   * jadi form "kirim Custom Offer" yang dulu ada di sini sudah dibuang.
   *
   * Order TIDAK langsung ada setelah accept: `create-order` dipicu event
   * database dan berjalan asinkron. Karena itu hasilnya di-poll, bukan
   * diasumsikan. Versi sebelumnya cuma menyetel status lokal jadi
   * "pending_payment" tanpa ada order yang benar-benar terbentuk.
   */
  const answerOffer = async (accept: boolean) => {
    if (!neg?.offerId || answering) return;
    setAnswering(true);

    if (accept) {
      try {
        if (!(await ensureCurrentConsent())) {
          setAnswering(false);
          toast.error("Gagal memverifikasi status persetujuan Syarat & Ketentuan. Coba lagi.");
          return;
        }
      } catch {
        setAnswering(false);
        toast.error("Gagal memverifikasi status persetujuan Syarat & Ketentuan. Coba lagi.");
        return;
      }
    }

    const res = accept ? await acceptOffer(neg.offerId) : await rejectOffer(neg.offerId);
    if (!res.success) {
      setAnswering(false);
      toast.error(res.error ?? "Gagal menjawab penawaran.");
      return;
    }

    if (!accept) {
      setAnswering(false);
      toast.success("Penawaran ditolak.");
      await loadRoom();
      return;
    }

    toast.success("Penawaran diterima. Menyiapkan pesanan…");

    setAnswering(false);
    await loadRoom();
  };

  const handleAcceptOrder = () => answerOffer(true);
  const handleRejectOffer = () => answerOffer(false);

  /**
   * Kirim hasil kerja — tautan https atau berkas terunggah.
   *
   * Untuk jalur berkas, `shareWithOrderId` WAJIB dikirim: tanpa itu
   * `validate-and-upload` hanya memberi izin baca kepada pengunggah, dan UMKM
   * yang harus mereview tidak akan bisa membukanya.
   *
   * Setiap kiriman jadi versi baru, bukan menimpa yang lama — riwayat revisi
   * harus utuh.
   */
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!neg?.orderId || submittingDeliverable) return;

    setSubmittingDeliverable(true);
    setDeliverableError(null);

    let fileUrl = deliverableUrl.trim();
    let fileId: string | undefined;

    if (deliverableMode === "storage") {
      if (!deliverableFile) {
        setSubmittingDeliverable(false);
        setDeliverableError("Pilih berkas yang mau dikirim.");
        return;
      }
      const uploaded = await uploadUserFile({
        file: deliverableFile,
        shareWithOrderId: neg.orderId,
      });
      if (!uploaded.success || !uploaded.data) {
        setSubmittingDeliverable(false);
        setDeliverableError(uploaded.error ?? "Gagal mengunggah berkas.");
        return;
      }
      fileUrl = uploaded.data.fileUrl;
      fileId = uploaded.data.fileId;
    }

    const res = await uploadDeliverable({
      orderId: neg.orderId,
      source: deliverableMode,
      fileUrl,
      fileId,
      notes: deliverableNotes.trim(),
    });
    setSubmittingDeliverable(false);

    if (!res.success) {
      setDeliverableError(res.error ?? "Gagal mengirim deliverable.");
      return;
    }

    setIsDeliverableModalOpen(false);
    setDeliverableUrl("");
    setDeliverableFile(null);
    setDeliverableNotes("");
    toast.success("Deliverable terkirim. Menunggu review UMKM.");
    await loadRoom();
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <CreatorPageSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center min-h-[70vh]">
        <CreatorEmptyState
          title="Gagal memuat percakapan"
          description={loadError}
          actionButton={
            <button
              onClick={() => void loadRoom()}
              className="text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow cursor-pointer"
              style={{ background: CREATOR_ACTION_GRADIENT }}
            >
              Coba Lagi
            </button>
          }
        />
      </div>
    );
  }

  if (!neg) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center min-h-[70vh]">
        <CreatorEmptyState
          title="Percakapan tidak ditemukan"
          description="Percakapan ini tidak dapat ditemukan atau sudah tidak aktif."
          actionButton={
            <Link href="/dashboard/kreator/negosiasi" className="text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow cursor-pointer" style={{ background: CREATOR_ACTION_GRADIENT }}>
              Kembali ke Negosiasi
            </Link>
          }
        />
      </div>
    );
  }

  // Offer yang MENUNGGU jawaban kreator. Dulu bernama isNegoState dan
  // dipatok ke `pending_payment` — tahap yang justru sudah terlambat: begitu
  // status itu tercapai, ordernya sudah terbentuk dan tidak ada yang bisa
  // diterima lagi.
  const hasPendingOffer = neg.stage === "offer_pending" && !!neg.offerId;

  // Kreator boleh mengirim hasil kerja hanya saat pesanan berjalan. `escrow`
  // ikut karena create-escrow memindahkan order ke in_progress secara asinkron —
  // ada jendela beberapa detik di mana UI masih melihat status lama.
  const canSubmitDeliverable =
    !!neg.orderId && (neg.stage === "in_progress" || neg.stage === "revision");
  const latestDeliverable = deliverables.length > 0 ? deliverables[deliverables.length - 1] : null;
  const awaitingReview = latestDeliverable?.status === "submitted";

  const platFee   = neg.platformFee   ?? calculatePlatformFee(neg.finalPrice);
  const totalAmt  = neg.totalAmount   ?? (neg.finalPrice - platFee);
  const deadline  = new Date(neg.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  // Checklist milestones
  const MILESTONE_STAGE_ORDER: Record<string, number> = {
    chatting: 0, offer_pending: 1, offer_rejected: 1, awaiting_order: 2,
    pending_payment: 3, escrow: 4, in_progress: 5, revision: 5, approved: 6, completed: 7,
  };
  const ms = MILESTONE_STAGE_ORDER[neg.stage] ?? 0;

  const milestones = [
    { label: "Inisiasi Negosiasi & Deal", done: ms >= 2 },
    { label: "Pembayaran Escrow UMKM", done: ms >= 4 },
    { label: "Kirim URL Collab Post", done: !!neg.submittedCollabUrl },
    { label: "Pelepasan Dana Escrow", done: neg.stage === "completed" },
  ];
  const doneCount = milestones.filter(m => m.done).length;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-5 sm:pb-5 lg:pb-5 relative h-[calc(100vh-84px)] flex flex-col min-h-0 overflow-hidden">
        <div className={cn("flex-1 flex flex-col min-h-0 w-full mx-auto", isChatFullscreen ? "max-w-none" : "max-w-7xl")}>

          {/* Back button */}
          {!isChatFullscreen && (
            <Link
              href="/dashboard/kreator/negosiasi"
              className="inline-flex items-center gap-2 text-xs font-extrabold text-neutral-500 hover:text-violet-700 transition-colors mb-5 group cursor-pointer shrink-0 w-fit"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Kembali ke Negosiasi
            </Link>
          )}

          {/* Main workspace grid */}
          <div className={cn("grid grid-cols-1 gap-5 flex-1 min-h-0 items-stretch", !isChatFullscreen && "lg:grid-cols-12")}>

            {/* ── LEFT: Chat pane (8 cols) ───────────────────────────────── */}
            <div className={cn("bg-white border border-neutral-200/60 shadow-[0_4px_24px_rgba(15,23,42,.05)] rounded-[22px] flex flex-col min-h-0 overflow-hidden", !isChatFullscreen && "lg:col-span-8")}>

              {/* Chat header */}
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-[13px] overflow-hidden bg-neutral-100 border border-neutral-200/40 flex items-center justify-center font-black text-neutral-300 text-base">
                      {neg.umkmAvatarUrl ? (
                        <img src={neg.umkmAvatarUrl} alt={neg.umkmName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{neg.umkmName.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-kreator-ink leading-tight">{neg.umkmName}</h4>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">{neg.projectTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={neg.stage} />
                  <button
                    type="button"
                    onClick={() => setIsChatFullscreen((v) => !v)}
                    aria-label={isChatFullscreen ? "Keluar dari fullscreen chat" : "Fullscreen chat"}
                    title={isChatFullscreen ? "Keluar fullscreen" : "Fullscreen chat"}
                    className="w-9 h-9 rounded-[12px] border border-neutral-200/70 bg-white text-neutral-500 hover:text-violet-700 hover:border-violet-200 hover:bg-violet-50/60 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {isChatFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Warning banner */}
              <div className="px-5 py-2.5 bg-amber-50/60 border-b border-amber-100/60 shrink-0 flex items-start gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                  Publikasi hasil konten wajib memakai fitur <span className="font-black">&quot;Collab Post&quot;</span> di Instagram / TikTok agar performa views dapat diverifikasi sistem.
                </p>
              </div>

              {/* Messages feed */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-neutral-50 premium-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                      <MessageSquareIcon className="w-6 h-6 text-neutral-300" />
                    </div>
                    <p className="text-xs text-neutral-400 font-bold max-w-[200px]">Belum ada obrolan. Kirim pesan negosiasi pertama di bawah.</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    if (msg.sender === "system") {
                      return (
                        <div key={msg.id} className="flex justify-center my-2 animate-in fade-in duration-200">
                          <span className="bg-white border border-neutral-200/60 text-neutral-500 text-[9px] font-bold px-4 py-1.5 rounded-full shadow-sm text-center">
                            ⚙️ {msg.text}
                          </span>
                        </div>
                      );
                    }

                    const isCreator = msg.sender === "creator";

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3 max-w-[82%] items-end animate-in fade-in slide-in-from-bottom-2 duration-300",
                          isCreator ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                      >
                        {!isCreator && (
                          <div className="w-7 h-7 rounded-[9px] overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200/30 mb-1">
                            {neg.umkmAvatarUrl && <img src={neg.umkmAvatarUrl} alt={neg.umkmName} className="w-full h-full object-cover" />}
                          </div>
                        )}

                        <div className="space-y-1 min-w-0">
                          {msg.isCustomOffer && msg.offerData ? (
                            /* Custom Offer card bubble */
                            <div className="bg-white border border-violet-200/50 shadow-kreator-avatar rounded-[18px] rounded-br-[6px] p-5 max-w-xs space-y-4">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="flex items-center gap-1.5 text-[8px] font-black text-violet-600 uppercase tracking-widest mb-1">
                                    <Sparkles className="w-3 h-3" />
                                    Custom Offer
                                  </span>
                                  <h5 className="font-extrabold text-kreator-ink text-xs leading-tight">{msg.offerData.title || (msg.text.startsWith("Penawaran Khusus: ") ? msg.text.replace("Penawaran Khusus: ", "") : null) || neg.projectTitle}</h5>
                                </div>
                                <span className="text-lg font-black text-violet-700 shrink-0 leading-none">
                                  {formatCurrency(msg.offerData.price)}
                                </span>
                              </div>

                              <p className="text-[11px] text-neutral-600 font-medium leading-relaxed border-l-2 border-violet-200 pl-3">
                                {msg.offerData.scope}
                              </p>

                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { label: "Revisi", val: `${msg.offerData.revisions}×` },
                                  {
                                    label: "Deadline",
                                    val: msg.offerData.deadline
                                      ? new Date(msg.offerData.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                                      : "—",
                                  },
                                ].map(({ label, val }) => (
                                  <div key={label} className="bg-neutral-50 rounded-[10px] p-2 text-center">
                                    <span className="block text-[7px] font-black text-neutral-400 uppercase tracking-wider">{label}</span>
                                    <span className="block text-[10px] font-black text-neutral-800 mt-0.5 truncate">{val}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="border-t border-neutral-100 pt-3">
                                {hasPendingOffer ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleAcceptOrder}
                                      disabled={answering}
                                      className="flex-1 py-2.5 rounded-[12px] text-[10px] font-extrabold text-white cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                                      style={{ background: CREATOR_ACTION_GRADIENT, boxShadow: "var(--shadow-kreator)" }}
                                    >
                                      {answering ? "Memproses…" : "Terima"}
                                    </button>
                                    <button
                                      onClick={handleRejectOffer}
                                      disabled={answering}
                                      className="px-4 py-2.5 rounded-[12px] text-[10px] font-extrabold text-neutral-600 bg-neutral-100 border border-neutral-200/60 hover:bg-neutral-200/60 cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      Tolak
                                    </button>
                                  </div>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-600">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Kesepakatan Terbuat
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "px-4 py-3 text-xs font-semibold leading-relaxed shadow-sm",
                                isCreator
                                  ? "bg-kreator-ink text-white rounded-[18px] rounded-br-[6px]"
                                  : "bg-white text-neutral-800 border border-neutral-200/50 rounded-[18px] rounded-bl-[6px]"
                              )}
                            >
                              {msg.text}
                            </div>
                          )}
                          <span className={cn("block text-[9px] text-neutral-400 font-bold px-1", isCreator ? "text-right" : "text-left")}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Composer */}
              <div className="p-4 bg-white border-t border-neutral-100 shrink-0 space-y-3">
                {/* Action toolbar */}
                {/*
                  Kreator TIDAK punya tombol "Buat Custom Offer" — membuat offer
                  adalah hak UMKM (docs/02_Modules/Offers/30_Business_Rules.md:13).
                  Yang tersedia di sini hanya menjawab penawaran yang masuk.

                  "Tandai Revisi Selesai" juga dibuang — ia hanya menyetel state
                  lokal. Menyelesaikan revisi caranya adalah MENGIRIM versi baru,
                  yang tombol di bawah lakukan dengan benar.
                */}
                {hasPendingOffer && (
                  <div className="flex flex-wrap gap-2 pb-3 border-b border-neutral-100">
                    <button
                      onClick={handleAcceptOrder}
                      disabled={answering}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-[11px] font-extrabold text-white cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: CREATOR_ACTION_GRADIENT, boxShadow: "var(--shadow-kreator)" }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {answering ? "Memproses…" : "Terima Penawaran"}
                    </button>
                    <button
                      onClick={handleRejectOffer}
                      disabled={answering}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-[11px] font-extrabold text-neutral-700 bg-neutral-100 border border-neutral-200/60 hover:bg-neutral-200/60 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <X className="w-3.5 h-3.5" />
                      Tolak
                    </button>
                  </div>
                )}

                {canSubmitDeliverable && (
                  <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-neutral-100">
                    <button
                      onClick={() => { setDeliverableError(null); setIsDeliverableModalOpen(true); }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-[11px] font-extrabold text-white cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
                      style={{ background: CREATOR_INK_ACTION_GRADIENT, boxShadow: "var(--shadow-kreator-ink)" }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {latestDeliverable ? `Kirim Ulang (v${latestDeliverable.version + 1})` : "Kirim Deliverable"}
                    </button>
                    {awaitingReview && (
                      <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-600">
                        <Clock className="w-3.5 h-3.5" />
                        {neg.deliverableValidation?.status === "valid" ? `v${latestDeliverable?.version} bukti lolos validasi Marketiv dan menunggu review UMKM` : neg.deliverableValidation?.status === "invalid" ? `v${latestDeliverable?.version} belum lolos validasi Marketiv${neg.deliverableValidation.reviewNotes ? `: ${neg.deliverableValidation.reviewNotes}` : ""}` : `v${latestDeliverable?.version} dikirim — menunggu validasi Marketiv`}
                      </span>
                    )}
                    {latestDeliverable?.status === "revision_requested" && (
                      <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-orange-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        UMKM minta revisi pada v{latestDeliverable.version}
                      </span>
                    )}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                  {/* (+) Quick action button */}
                  <div className="relative shrink-0" ref={quickMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsQuickMenuOpen((v) => !v)}
                      aria-label="Aksi cepat"
                      className="w-10 h-10 rounded-[13px] flex items-center justify-center transition-all duration-150 cursor-pointer"
                      style={
                        isQuickMenuOpen
                          ? {
                              background: "color-mix(in srgb, var(--color-kreator-600) 8%, transparent)",
                              color: "var(--color-kreator-600)",
                            }
                          : { color: "var(--color-neutral-400)" }
                      }
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>

                    {isQuickMenuOpen && (
                      <div
                        className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-[16px] p-1.5 z-30"
                        style={{
                          border: "1px solid rgba(17,24,39,.08)",
                          boxShadow: "0 16px 48px rgba(15,23,42,.16), 0 4px 12px rgba(15,23,42,.06)",
                        }}
                      >
                        <div className="px-2.5 py-1.5 mb-0.5">
                          <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Aksi Cepat</span>
                        </div>

                        {hasPendingOffer && (
                          <>
                            <button
                              type="button"
                              disabled={answering}
                              onClick={() => { handleAcceptOrder(); setIsQuickMenuOpen(false); }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-left text-[11px] font-extrabold text-neutral-800 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <span className="text-sm shrink-0">✅</span>
                              <span>Terima Penawaran</span>
                            </button>
                            <button
                              type="button"
                              disabled={answering}
                              onClick={() => { handleRejectOffer(); setIsQuickMenuOpen(false); }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-left text-[11px] font-extrabold text-neutral-800 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <span className="text-sm shrink-0">✋</span>
                              <span>Tolak Penawaran</span>
                            </button>
                          </>
                        )}

                        <div className="my-1 mx-2 border-t border-neutral-100" />
                        {[
                          { icon: "💬", label: "Sedang dikerjakan", text: "Konten sedang dalam proses pengerjaan kak, mohon ditunggu." },
                          { icon: "⏳", label: "Minta perpanjangan", text: "Mohon maaf kak, apakah deadline bisa diundur sedikit?" },
                        ].map((t, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setInputMessage(t.text); setIsQuickMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-left text-[11px] font-extrabold text-neutral-800 hover:bg-neutral-50 transition-colors cursor-pointer"
                          >
                            <span className="text-sm shrink-0">{t.icon}</span>
                            <span className="truncate">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Tulis pesan negosiasi..."
                    className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all font-semibold text-neutral-800 placeholder-neutral-400"
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputMessage.trim()}
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                    style={{ background: CREATOR_ACTION_GRADIENT, boxShadow: "var(--shadow-kreator)" }}
                  >
                    {sending
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <Send className="w-4 h-4 text-white" />
                    }
                  </button>
                </form>
              </div>
            </div>

            {/* ── RIGHT: Info pane (4 cols) ──────────────────────────────── */}
            {!isChatFullscreen && (
            <div className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto px-4 py-4 -mx-4 -my-4 max-h-[calc(100%+32px)] pr-2 premium-scrollbar">

              {/* Contract details card */}
              <div className="bg-white border border-neutral-200/60 shadow-[0_4px_24px_rgba(15,23,42,.05)] rounded-[22px] p-4 space-y-4">
                <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-2">
                  Rincian Kontrak Kerja
                </h4>

                <div className="space-y-3">
                  <div>
                    <span className="block text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Kesepakatan Final</span>
                    <span className="block font-extrabold text-kreator-ink text-sm leading-tight">{neg.projectTitle}</span>
                  </div>

                  {neg.packageContext && (
                    <div className="rounded-[12px] border border-violet-100 bg-violet-50/60 p-2.5">
                      <span className="block text-[8px] font-black text-violet-500 uppercase tracking-widest mb-1">Paket Acuan</span>
                      <p className="text-xs font-extrabold text-kreator-ink">{neg.packageContext.name}</p>
                      <p className="text-[10px] font-semibold text-violet-700 mt-0.5">Harga paket {formatCurrency(neg.packageContext.basePrice)}. Harga final tetap dari kesepakatan.</p>
                    </div>
                  )}

                  <div>
                    <span className="block text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Ruang Lingkup</span>
                    <p className="text-xs text-neutral-600 font-semibold leading-relaxed">{neg.scope}</p>
                  </div>

                  {neg.deliverables && (
                    <div>
                      <span className="block text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Deliverables</span>
                      <span className="block text-xs font-extrabold text-neutral-700">{neg.deliverables}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-50 rounded-[12px] p-2.5 border border-neutral-100">
                      <span className="flex items-center gap-1 text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
                        <Clock className="w-2.5 h-2.5" /> Deadline
                      </span>
                      <span className="block text-xs font-extrabold text-neutral-800">{deadline}</span>
                    </div>
                    <div className="bg-neutral-50 rounded-[12px] p-2.5 border border-neutral-100">
                      <span className="block text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Maks Revisi</span>
                      <span className="block text-xs font-extrabold text-neutral-800">
                        {neg.revisionCount != null ? `${neg.revisionCount}×` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Billing breakdown */}
                  <div className="bg-gradient-to-br from-violet-50/60 to-indigo-50/30 rounded-[14px] p-3 border border-violet-100/60 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-neutral-500">
                      <span>Harga Kesepakatan</span>
                      <span>{formatCurrency(neg.finalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-neutral-500">
                      <span>Biaya Platform ({PLATFORM_FEE_RATE * 100}%)</span>
                      <span>-{formatCurrency(platFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-kreator-ink border-t border-violet-100 pt-2">
                      <span>Total Diterima</span>
                      <span>{formatCurrency(totalAmt)}</span>
                    </div>
                  </div>

                  {/* Escrow status */}
                  <div>
                    <span className="block text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-2">Status Escrow</span>
                    <div className={cn(
                      "flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] border w-fit",
                      neg.escrowStatus === "held"
                        ? "bg-emerald-50 border-emerald-200/50 text-emerald-700"
                        : neg.escrowStatus === "released"
                        ? "bg-blue-50 border-blue-200/50 text-blue-700"
                        : "bg-amber-50 border-amber-200/50 text-amber-700"
                    )}>
                      {neg.escrowStatus === "held" ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">
                        {neg.escrowStatus ? getEscrowStatusLabel(neg.escrowStatus) : "Belum Ada Escrow"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deliverables checklist */}
              <div className="bg-white border border-neutral-200/60 shadow-[0_4px_24px_rgba(15,23,42,.05)] rounded-[22px] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Checklist Deliverables</h4>
                  <span className="text-[9px] font-extrabold text-violet-600 bg-violet-50 border border-violet-200/50 px-2 py-0.5 rounded-full">
                    {doneCount}/{milestones.length}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(doneCount / milestones.length) * 100}%`,
                      background: CREATOR_PROGRESS_GRADIENT,
                    }}
                  />
                </div>

                <div className="space-y-2.5">
                  {milestones.map((m, i) => (
                    <div key={i} className={cn("flex items-center gap-3 transition-opacity", !m.done && "opacity-60")}>
                      <div className={cn(
                        "w-5 h-5 rounded-[7px] flex items-center justify-center shrink-0 transition-all",
                        m.done
                          ? "text-white"
                          : "bg-white border-2 border-neutral-200"
                      )}
                        style={m.done ? { background: CREATOR_ACTION_GRADIENT } : undefined}
                      >
                        {m.done && <Check className="w-3 h-3" />}
                      </div>
                      <span className={cn("text-xs font-semibold", m.done ? "text-neutral-500 line-through" : "text-neutral-700")}>
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}

          </div>
        </div>

      {/* ── Modal: Kirim Deliverable ─────────────────────────────────────── */}
      {isDeliverableModalOpen && (
        <ResponsiveModal open={isDeliverableModalOpen} onOpenChange={(open) => !open && setIsDeliverableModalOpen(false)}>
          <ResponsiveModalContent className="max-w-md w-full rounded-[24px] border border-neutral-200/50 p-6 sm:p-7">
            <ResponsiveModalHeader className="sr-only">
              <ResponsiveModalTitle>Kirim Deliverable</ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Kirim tautan atau berkas hasil kerja ke UMKM.
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
            <div className="flex justify-between items-start gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Send className="w-4 h-4 text-neutral-700" />
                  <h3 className="text-base font-black text-kreator-ink">
                    {latestDeliverable ? `Kirim Ulang — versi ${latestDeliverable.version + 1}` : "Kirim Deliverable"}
                  </h3>
                </div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{neg.projectTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeliverableModalOpen(false)}
                className="p-1.5 rounded-[10px] text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {deliverableError && (
              <div className="bg-red-50 border border-red-200/60 rounded-[12px] p-3.5 text-red-700 text-xs font-bold mb-4 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{deliverableError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              {/* Pilih sumber. Keduanya sah — tautan untuk postingan yang sudah
                  tayang, unggahan untuk berkas mentah yang belum dipublikasikan. */}
              <div className="flex gap-2">
                {([
                  { id: "external_url" as const, label: "Kirim Tautan" },
                  { id: "storage" as const, label: "Unggah Berkas" },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { setDeliverableMode(opt.id); setDeliverableError(null); }}
                    className={cn(
                      "flex-1 py-2.5 rounded-[12px] text-[11px] font-extrabold border transition-all cursor-pointer",
                      deliverableMode === opt.id
                        ? "bg-violet-50 border-violet-300 text-violet-700"
                        : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {deliverableMode === "external_url" ? (
                <div>
                  <label htmlFor="deliverable-url" className="block text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                    Link Hasil Kerja
                  </label>
                  <input
                    id="deliverable-url"
                    type="url"
                    required
                    placeholder="https://www.instagram.com/reel/CtO12345/"
                    value={deliverableUrl}
                    onChange={(e) => { setDeliverableUrl(e.target.value); if (deliverableError) setDeliverableError(null); }}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-[14px] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all font-semibold text-neutral-800 placeholder-neutral-400"
                  />
                  <p className="text-[9px] text-neutral-400 font-bold mt-1.5 leading-relaxed">
                    Wajib https://. Bisa tautan postingan, Google Drive, atau penyimpanan lain
                    yang bisa dibuka UMKM.
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="deliverable-file" className="block text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                    Berkas Hasil Kerja
                  </label>
                  <input
                    id="deliverable-file"
                    type="file"
                    required
                    onChange={(e) => {
                      setDeliverableFile(e.target.files?.[0] ?? null);
                      if (deliverableError) setDeliverableError(null);
                    }}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-[14px] text-xs font-semibold text-neutral-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:font-extrabold file:bg-violet-50 file:text-violet-700 cursor-pointer"
                  />
                  <p className="text-[9px] text-neutral-400 font-bold mt-1.5 leading-relaxed">
                    Maksimal {Math.floor(MAX_USER_FILE_BYTES / 1024 / 1024)} MB dan memakai kuota
                    penyimpananmu. UMKM otomatis diberi izin membuka berkas ini.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="deliverable-notes" className="block text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                  Catatan untuk UMKM <span className="text-neutral-300">(opsional)</span>
                </label>
                <textarea
                  id="deliverable-notes"
                  rows={3}
                  placeholder="Contoh: Bagian logo sudah saya perbesar di detik 0:12 sesuai permintaan."
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all font-semibold text-neutral-800 placeholder-neutral-400 resize-none leading-relaxed"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200/50 rounded-[12px] p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                  Pastikan tautannya bisa dibuka UMKM. Setelah UMKM menyetujui, dana escrow
                  dilepaskan ke saldo kamu dikurangi fee platform {PLATFORM_FEE_RATE * 100}%.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeliverableModalOpen(false)}
                  disabled={submittingDeliverable}
                  className="flex-1 py-3 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-extrabold text-xs rounded-full transition-all cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingDeliverable}
                  className="flex-1 py-3 text-white font-extrabold text-xs rounded-full border border-transparent transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: CREATOR_INK_ACTION_GRADIENT, boxShadow: "var(--shadow-kreator-ink)" }}
                >
                  {submittingDeliverable ? "Mengirim…" : "Kirim"}
                </button>
              </div>
            </form>
          </ResponsiveModalContent>
        </ResponsiveModal>
      )}

      {/*
        Dua modal dibuang di sini:

        "Buat Custom Offer" — melanggar docs/02_Modules/Offers/30_Business_Rules.md:13,
        yang menetapkan hanya UMKM yang boleh membuat offer. Permission baris
        `offers` juga sudah menegakkan itu: kreator hanya diberi `update`.

        "Submit Link Collab Post" — hanya menyetel state lokal (`setNeg(status:
        "approved")`) tanpa menulis baris `deliverables` apa pun, jadi dana escrow
        tidak akan pernah cair karenanya. Jalur deliverable yang sebenarnya masuk
        s4-rc-deliverable.
      */}
    </div>
  );
}

// Inline SVG icon to avoid extra import
function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}
