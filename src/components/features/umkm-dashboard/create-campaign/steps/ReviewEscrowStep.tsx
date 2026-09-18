"use client";

import { FormSectionCard } from "../cards/FormSectionCard";
import { formatCurrency, formatCompactNumber } from "@/lib/formatters";
import { calculatePlatformFee, calculateTotalPayment } from "@/types/domain";
import { DashboardBadge } from "@/components/features/umkm-dashboard/shared/DashboardBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { TONE_OPTIONS, CTA_OPTIONS } from "../create-campaign.constants";
import { cn } from "@/lib/utils";

interface ReviewEscrowStepProps {
  title: string;
  category: string;
  description: string;
  brief: string;
  videoStyle: string;
  requiredPoints: string;
  callToAction: string;
  hashtags: string;
  externalAssetUrl: string;
  assetNotes?: string;
  pricePerThousandViews: number;
  totalBudgetEscrow: number;
  creatorQuota: number;
  // checklist states
  termsAgreed: boolean;
  onChangeTermsAgreed: (val: boolean) => void;
  onJumpToStep?: (step: number) => void;
  validationErrors?: Record<string, string>;
}

export function ReviewEscrowStep({
  title,
  category,
  description,
  brief,
  videoStyle,
  requiredPoints,
  callToAction,
  hashtags,
  externalAssetUrl,
  assetNotes = "",
  pricePerThousandViews,
  totalBudgetEscrow,
  creatorQuota,
  termsAgreed,
  onChangeTermsAgreed,
  onJumpToStep,
  validationErrors = {},
}: ReviewEscrowStepProps) {
  const platformFee = calculatePlatformFee(totalBudgetEscrow);
  const totalPayment = calculateTotalPayment(totalBudgetEscrow);
  const estimatedViews =
    pricePerThousandViews > 0
      ? Math.round((totalBudgetEscrow / pricePerThousandViews) * 1000)
      : 0;

  const videoStyleLabel =
    TONE_OPTIONS.find((t) => t.id === videoStyle)?.label || videoStyle || "-";
  const ctaLabel =
    CTA_OPTIONS.find((c) => c.id === callToAction)?.label || callToAction || "-";

  return (
    <FormSectionCard
      title="Periksa & Konfirmasi Kampanye"
      description="Pastikan informasi produk, arahan konten, dan anggaran sudah sesuai sebelum melanjutkan ke pembayaran."
    >
      {/* ── Section 1: Informasi Produk ───────────────────── */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4.5 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200/50 pb-2.5">
          <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
            Informasi Produk
          </span>
          {onJumpToStep && (
            <button
              type="button"
              onClick={() => onJumpToStep(1)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ubah</span>
            </button>
          )}
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Nama Produk
            </span>
            <span className="text-sm font-extrabold text-text-primary block mt-0.5">
              {title || "-"}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
              Kategori
            </span>
            {category ? (
              <DashboardBadge type="category" value={category} className="font-extrabold uppercase text-[10px]" />
            ) : (
              <span className="text-text-muted italic">-</span>
            )}
          </div>

          <div>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Deskripsi Produk
            </span>
            <p className="text-text-secondary mt-0.5 whitespace-pre-line leading-relaxed font-medium">
              {description || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Arahan Konten ───────────────────────── */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4.5 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200/50 pb-2.5">
          <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
            Arahan Konten
          </span>
          {onJumpToStep && (
            <button
              type="button"
              onClick={() => onJumpToStep(2)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ubah</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Gaya Konten
            </span>
            <span className="font-bold text-text-primary block mt-0.5">
              {videoStyleLabel}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Ajakan untuk Penonton (CTA)
            </span>
            <span className="font-bold text-text-primary block mt-0.5">
              {ctaLabel}
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Arahan Anda
            </span>
            <p className={cn("mt-0.5 whitespace-pre-line leading-relaxed font-medium", brief ? "text-text-primary" : "text-text-muted italic")}>
              {brief ? brief : "Tidak ada arahan tambahan."}
            </p>
          </div>

          <div className="sm:col-span-2">
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Panduan Kreator
            </span>
            <p className={cn("mt-0.5 whitespace-pre-line leading-relaxed font-medium", requiredPoints ? "text-text-primary" : "text-text-muted italic")}>
              {requiredPoints ? requiredPoints : "Belum ditambahkan."}
            </p>
          </div>

          {hashtags && (
            <div className="sm:col-span-2">
              <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Hashtag / Tagar
              </span>
              <span className="font-bold text-primary block mt-0.5">
                {hashtags}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Foto & Video Produk ────────────────── */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4.5 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200/50 pb-2.5">
          <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
            Foto & Video Produk
          </span>
          {onJumpToStep && (
            <button
              type="button"
              onClick={() => onJumpToStep(3)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ubah</span>
            </button>
          )}
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Folder Foto & Video
            </span>
            {externalAssetUrl ? (
              <a
                href={externalAssetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-primary hover:underline break-all inline-flex items-center gap-1.5 mt-0.5"
              >
                <span>{externalAssetUrl}</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md">Buka Folder ↗</span>
              </a>
            ) : (
              <span className="text-text-muted italic block mt-0.5">-</span>
            )}
          </div>

          {assetNotes && (
            <div>
              <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Catatan untuk Kreator
              </span>
              <p className="text-text-secondary mt-0.5 font-medium">
                {assetNotes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 4: Anggaran ───────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4.5 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200/50 pb-2.5">
          <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
            Anggaran
          </span>
          {onJumpToStep && (
            <button
              type="button"
              onClick={() => onJumpToStep(4)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ubah</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Dana Kampanye
            </span>
            <span className="font-extrabold text-orange-600 block mt-0.5">
              {formatCurrency(totalBudgetEscrow)}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Bayaran / 1.000 Tayangan
            </span>
            <span className="font-bold text-text-primary block mt-0.5">
              {formatCurrency(pricePerThousandViews)}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Jumlah Kreator
            </span>
            <span className="font-bold text-text-primary block mt-0.5">
              {creatorQuota} kreator
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Perkiraan Tayangan
            </span>
            <span className="font-bold text-emerald-700 block mt-0.5">
              ± {formatCompactNumber(estimatedViews)} tayangan
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 5: Rincian Pembayaran & Bagaimana Dana Diproses ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Rincian Pembayaran (Left Card - Flex Col Justify Between) */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4.5 sm:p-5 flex flex-col justify-between space-y-4 shadow-2xs">
          <div className="space-y-3">
            <span className="block text-xs font-bold text-text-primary uppercase tracking-wide border-b border-neutral-200/50 pb-2.5">
              Rincian Pembayaran
            </span>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-text-secondary">
                <span>Dana Kampanye (Subtotal)</span>
                <span className="font-bold text-text-primary">{formatCurrency(totalBudgetEscrow)}</span>
              </div>

              <div className="flex justify-between items-center text-text-secondary">
                <span>Biaya Layanan Marketiv (2%)</span>
                <span className="font-bold text-text-primary">{formatCurrency(platformFee)}</span>
              </div>

              {/* Ringkasan Alokasi Box */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 space-y-1.5 text-[11px] my-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Ringkasan Alokasi
                </span>
                <div className="grid grid-cols-2 gap-2 text-text-secondary">
                  <div>
                    <span className="text-text-muted block text-[10px]">Bayaran / 1K Tayangan:</span>
                    <strong className="text-text-primary">{formatCurrency(pricePerThousandViews)}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">Jumlah Kreator:</span>
                    <strong className="text-text-primary">{creatorQuota} Kreator</strong>
                  </div>
                  <div className="col-span-2 border-t border-neutral-200/40 pt-1 mt-0.5">
                    <span className="text-text-muted block text-[10px]">Perkiraan Total Tayangan:</span>
                    <strong className="text-emerald-700">± {formatCompactNumber(estimatedViews)} tayangan</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Callout Box at Bottom of Left Card */}
          <div className="bg-orange-50/80 border border-orange-200/90 rounded-xl p-3.5 flex items-center justify-between mt-auto">
            <div>
              <span className="block text-[10px] font-extrabold text-orange-900 uppercase tracking-wider">
                Total Pembayaran
              </span>
              <span className="text-[10px] text-orange-700 font-medium block">
                Sudah termasuk biaya layanan (2%)
              </span>
            </div>
            <span className="text-base font-black text-orange-600 font-display">
              {formatCurrency(totalPayment)}
            </span>
          </div>
        </div>

        {/* Bagaimana dana diproses (Right Card) */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4.5 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-2xs">
          <div className="space-y-3">
            <span className="block text-xs font-bold text-text-primary uppercase tracking-wide border-b border-neutral-200/50 pb-2.5">
              Bagaimana dana kampanye diproses?
            </span>
            <div className="space-y-2.5 text-[11px] text-text-secondary font-medium">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">1</span>
                <div>
                  <strong className="text-text-primary block text-xs">Anda melakukan pembayaran</strong>
                  <span className="text-text-muted">Dana kampanye dibayarkan melalui Marketiv.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">2</span>
                <div>
                  <strong className="text-text-primary block text-xs">Kreator membuat & menerbitkan konten</strong>
                  <span className="text-text-muted">Kreator menjalankan pekerjaan sesuai kampanye.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs shrink-0 mt-0.5">3</span>
                <div>
                  <strong className="text-text-primary block text-xs">Hasil diperiksa & pembayaran diproses</strong>
                  <span className="text-text-muted">Pembayaran kreator diproses setelah tayangan tervalidasi.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 text-[10.5px] text-text-muted space-y-0.5">
            <strong className="text-text-primary block text-[11px]">Perlindungan Dana</strong>
            <span>Dana kampanye diproses berdasarkan status pekerjaan dan hasil yang telah diverifikasi. Ketentuan pengembalian dana mengikuti kebijakan Marketiv.</span>
          </div>
        </div>
      </div>

      {/* Confirmation Checkbox */}
      <div id="field-terms-agreed" className="space-y-2 pt-3 border-t border-neutral-200/60">
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms-agreed"
            checked={termsAgreed}
            onCheckedChange={(checked) => onChangeTermsAgreed(!!checked)}
            className="mt-0.5 cursor-pointer"
          />
          <label htmlFor="terms-agreed" className="min-w-0 cursor-pointer select-none">
            <span className="block text-xs font-bold text-text-primary leading-tight">
              Saya sudah memeriksa informasi kampanye dan rincian pembayaran di atas.
            </span>
            <span className="block text-[11px] text-text-muted mt-1 leading-relaxed font-medium">
              Pastikan data sudah benar sebelum melanjutkan. Dengan melanjutkan, Anda menyetujui Ketentuan Kampanye Marketiv.
            </span>
          </label>
        </div>
        {validationErrors.termsAgreed && (
          <p className="text-xs text-destructive pl-7">{validationErrors.termsAgreed}</p>
        )}
      </div>
    </FormSectionCard>
  );
}
