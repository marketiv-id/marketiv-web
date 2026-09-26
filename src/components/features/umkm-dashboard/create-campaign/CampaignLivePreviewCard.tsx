"use client";

import { useRef } from "react";
import { Eye, Users, Zap, Camera } from "lucide-react";
import { formatCurrency, formatCompactNumber } from "@/lib/formatters";
import { DashboardBadge } from "../shared/DashboardBadge";

interface CampaignLivePreviewCardProps {
  title: string;
  category: string;
  brief: string;
  pricePerThousandViews: number;
  totalBudgetEscrow: number;
  creatorQuota: number;
  /** Thumbnail campaign terpilih/terunggah — dikontrol penuh oleh wizard. */
  coverUrl?: string;
  /**
   * Dipanggil saat user memilih file — wizard yang mengunggah & menyimpan
   * thumbnail. TIDAK menerima blob URL: URL pratinjau transien tidak boleh
   * menjadi `thumbnailUrl` permanen.
   */
  onSelectCoverFile?: (file: File) => void;
}

export function CampaignLivePreviewCard({
  title,
  category,
  brief,
  pricePerThousandViews,
  totalBudgetEscrow,
  creatorQuota,
  coverUrl = "",
  onSelectCoverFile,
}: CampaignLivePreviewCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayTitle = title.trim() || null;
  const displayBrief = brief.trim() || null;
  const activeCoverUrl = coverUrl;

  const estimatedViews =
    pricePerThousandViews > 0
      ? Math.round((totalBudgetEscrow / pricePerThousandViews) * 1000)
      : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset supaya file yang sama bisa dipilih ulang.
    e.target.value = "";
    if (file && onSelectCoverFile) {
      onSelectCoverFile(file);
    }
  };

  return (
    <div
      className="rounded-2xl sm:rounded-[22px] overflow-hidden flex flex-col select-none"
      style={{ border: "1px solid rgba(17,24,39,.08)", boxShadow: "0 4px 20px rgba(15,23,42,.06)" }}
    >
      {/* ── Cover banner ──────────────────────────────────── */}
      <div
        className="relative h-36 w-full flex items-center justify-center overflow-hidden group transition-all"
        style={{
          background: activeCoverUrl
            ? `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%), url(${activeCoverUrl}) center/cover no-repeat`
            : "radial-gradient(circle at 20% 50%, rgba(251,122,24,.70) 0%, transparent 60%), " +
              "radial-gradient(circle at 80% 20%, rgba(234,88,12,.55) 0%, transparent 55%), " +
              "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
        }}
      >
        {/* Decorative blobs (only when no cover image) */}
        {!activeCoverUrl && (
          <>
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/[.06]" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-black/[.08]" />
          </>
        )}

        {/* Category badge */}
        <div className="absolute top-3 left-3 z-10">
          {category ? (
            <DashboardBadge
              type="category"
              value={category}
              className="font-extrabold uppercase text-[10px]"
            />
          ) : (
            <span className="text-[9px] font-[800] text-white/70 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full uppercase tracking-wider">
              Pilih kategori
            </span>
          )}
        </div>

        {/* Live badge */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[9px] font-[800] text-white uppercase tracking-wider">Live Preview</span>
        </div>

        {/* Cover upload / change action button */}
        <div className="relative z-10 text-center text-white flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/35 text-white text-[10.5px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105"
          >
            <Camera size={14} className="text-white shrink-0" />
            <span>{activeCoverUrl ? "Ganti Gambar Cover" : "Upload Gambar Cover"}</span>
          </button>
          {!activeCoverUrl && (
            <span className="text-[9px] font-[600] tracking-wider uppercase opacity-85 mt-1 text-white/90">
              Pilih foto background card
            </span>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* ── Card body ─────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-3.5 bg-white flex-1">
        {/* Title & brief */}
        <div className="space-y-1.5">
          <h4 className={`text-[.86rem] font-[760] leading-snug line-clamp-1 font-display ${displayTitle ? "text-ink-950" : "text-ink-300 italic"}`}>
            {displayTitle ?? "Judul campaign akan muncul di sini"}
          </h4>
          <p className={`text-[.74rem] leading-relaxed line-clamp-2 ${displayBrief ? "text-ink-500 font-[550]" : "text-ink-300 italic"}`}>
            {displayBrief ?? "Tambahkan arahan konten jika Anda memiliki preferensi khusus."}
          </p>
        </div>

        {/* Stats grid */}
        <div
          className="grid grid-cols-2 gap-2.5 pt-3"
          style={{ borderTop: "1px dashed rgba(17,24,39,.10)" }}
        >
          {/* Escrow */}
          <div className="space-y-0.5">
            <span className="flex items-center gap-1 text-[.66rem] font-[700] text-ink-400 uppercase tracking-wider">
              <Zap size={9} className="text-orange-400" />
              Anggaran Escrow
            </span>
            <span className="text-[.84rem] font-[800] text-orange-600 font-display leading-none">
              {formatCurrency(totalBudgetEscrow)}
            </span>
          </div>

          {/* Rate */}
          <div className="space-y-0.5">
            <span className="text-[.66rem] font-[700] text-ink-400 uppercase tracking-wider block">
              Bayaran / 1K Views
            </span>
            <span className="text-[.84rem] font-[800] text-ink-800 font-display leading-none">
              {formatCurrency(pricePerThousandViews)}
            </span>
          </div>

          {/* Kreator quota */}
          <div className="space-y-0.5">
            <span className="flex items-center gap-1 text-[.66rem] font-[700] text-ink-400 uppercase tracking-wider">
              <Users size={9} className="text-blue-400" />
              Kuota Kreator
            </span>
            <span className="text-[.84rem] font-[800] text-ink-800 font-display leading-none">
              {creatorQuota} Slot
            </span>
          </div>

          {/* Target views */}
          <div className="space-y-0.5">
            <span className="flex items-center gap-1 text-[.66rem] font-[700] text-ink-400 uppercase tracking-wider">
              <Eye size={9} className="text-emerald-400" />
              Target Views
            </span>
            <span className="text-[.84rem] font-[800] text-emerald-600 font-display leading-none">
              {formatCompactNumber(estimatedViews)} Views
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
