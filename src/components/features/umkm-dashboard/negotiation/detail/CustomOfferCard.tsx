"use client";

import { ChatMessage, NegotiationStage } from "@/types/umkm-dashboard.types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { deadlineTime } from "../negotiation.utils";

interface CustomOfferCardProps {
  message: ChatMessage;
  onPay: () => void;
  /** Tarik kembali penawaran yang belum dijawab. Hanya untuk offer aktif. */
  onDeleteOffer?: (offerId: string) => void;
  stage: NegotiationStage;
  /** offerId yang sedang aktif di ruang ini — kartu lama tidak dapat aksi. */
  activeOfferId?: string;
}

export function CustomOfferCard({
  message,
  onPay,
  onDeleteOffer,
  stage,
  activeOfferId,
}: CustomOfferCardProps) {
  const offer = message.offerData;
  if (!offer) return null;

  // Kartu ini hanya bisa ditindaklanjuti kalau ia MEMANG penawaran yang sedang
  // berlaku. Satu percakapan bisa punya beberapa offer (ditolak lalu ditawar
  // ulang), dan kartu lama tetap terlihat sebagai riwayat.
  const isActive = !!activeOfferId && offer.offerId === activeOfferId;

  // Sebelumnya dicek terhadap "negotiation" / "waiting_payment" — dua nilai yang
  // tidak ada di union stage mana pun, jadi tombolnya tidak pernah muncul dan
  // badge-nya selalu berbunyi "Tawaran Disetujui" bahkan saat belum dijawab.
  const showPayAction = isActive && stage === "pending_payment";
  const isPending = isActive && stage === "offer_pending";
  const canWithdraw = isPending && !!onDeleteOffer;

  const badge = isPending
    ? { text: "Menunggu Kreator", className: "bg-warning-soft/30 border-warning-soft text-warning-strong" }
    : showPayAction
      ? { text: "Diterima — Menunggu Bayar", className: "bg-warning-soft/30 border-warning-soft text-warning-strong" }
      : stage === "offer_rejected" && isActive
        ? { text: "Ditolak Kreator", className: "bg-neutral-100 border-neutral-200 text-neutral-600" }
        : { text: "Tawaran Disetujui", className: "bg-success-soft/30 border-success-soft text-success-strong" };


  return (
    <div className="flex justify-center my-6 w-full select-none">
      <div className="offer-card w-full max-w-lg space-y-4 relative overflow-hidden">
        
        {/* Title & Badge */}
        <div className="flex items-center justify-between gap-3 border-b border-border-soft pb-3">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-extrabold shadow-3xs" aria-hidden="true">
              ★
            </span>
            <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">
              Penawaran Harga Khusus
            </span>
          </div>
          <span className={cn(
            "px-2.5 py-0.5 rounded-full border text-[8px] font-extrabold uppercase tracking-wider",
            badge.className
          )}>
            {badge.text}
          </span>
        </div>

        {/* Contract specs list */}
        <div className="space-y-3 text-xs font-semibold text-text-secondary">
          <div className="space-y-0.5">
            <span className="block text-[8px] font-bold text-text-muted uppercase tracking-wider">
              Judul Proyek
            </span>
            <h4 className="text-xs font-extrabold text-text-primary leading-tight">
              {offer.title || message.content}
            </h4>
          </div>

          <div className="space-y-0.5">
            <span className="block text-[8px] font-bold text-text-muted uppercase tracking-wider">
              Lingkup Pekerjaan
            </span>
            <p className="text-[10px] text-text-secondary leading-relaxed font-semibold">
              {offer.scope}
            </p>
          </div>

          {/* Pricing & Deadline parameters */}
          <div className="grid grid-cols-3 gap-3 border-y border-dashed border-border-soft py-3">
            <div>
              <span className="block text-[8px] font-bold text-text-muted uppercase tracking-wider">
                Harga Proyek
              </span>
              <span className="text-xs font-extrabold text-primary block mt-0.5">
                {formatCurrency(offer.finalPrice)}
              </span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-text-muted uppercase tracking-wider">
                Batas Waktu
              </span>
              <span className="text-xs font-extrabold text-text-primary block mt-0.5">
                {deadlineTime(offer.deadline)}
              </span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-text-muted uppercase tracking-wider">
                Batas Revisi
              </span>
              <span className="text-xs font-extrabold text-text-primary block mt-0.5">
                {offer.revisionCount}x Revisi
              </span>
            </div>
          </div>
        </div>

        {/* Escrow note */}
        <div className="text-[9px] text-text-muted leading-relaxed font-semibold">
          * Dana pembayaran Anda disimpan di <strong>sistem aman Marketiv</strong> dan baru
          dilepaskan ke kreator setelah Anda menyetujui hasil kerjanya. Nominal yang Anda bayar
          persis sebesar harga di atas — biaya layanan ditanggung kreator.
        </div>

        {showPayAction && (
          <button
            type="button"
            onClick={onPay}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs border border-primary hover:border-primary-600 text-center"
          >
            Bayar & Simpan Dana Aman
          </button>
        )}

        {/* s35-ui-offer — dulu ditunda karena ChatMessage.offerData tidak membawa
            offerId. Sekarang membawanya, jadi penawaran yang belum dijawab bisa
            ditarik kembali. */}
        {canWithdraw && (
          <button
            type="button"
            onClick={() => onDeleteOffer?.(offer.offerId)}
            className="w-full py-2.5 rounded-xl border border-neutral-200 text-text-secondary hover:bg-neutral-50 text-xs font-bold transition-all duration-200 cursor-pointer text-center"
          >
            Batalkan Penawaran
          </button>
        )}
      </div>
    </div>
  );
}
