import { Shield, Megaphone, MessageSquare } from "lucide-react";
import { EscrowOverview } from "@/types/umkm-dashboard.types";
import { formatCurrency } from "@/lib/formatters";
import { formatPlatformFeePercent } from "@/types/domain";

interface EscrowOverviewCardProps {
  overview: EscrowOverview;
}

const ESCROW_FLOW_STEPS = [
  { number: "1", title: "Simpan Dana Kolaborasi", desc: "Anda menyimpan dana di awal transaksi" },
  { number: "2", title: "Dana Aman Tersimpan", desc: "Dana ditahan sementara di sistem Dana Aman Marketiv" },
  { number: "3", title: "Kreator Menyelesaikan Konten", desc: "Kreator memposting dan mengunggah tautan bukti" },
  { number: "4", title: "Dana Dicairkan ke Kreator", desc: "Dana dicairkan setelah lolos verifikasi sistem" },
];

export function EscrowOverviewCard({ overview }: EscrowOverviewCardProps) {
  const feeLabel = `Biaya ${formatPlatformFeePercent()}`;
  const feeDisclosure = `biaya layanan platform ${formatPlatformFeePercent()}`;

  return (
    <div className="border border-neutral-200/80 rounded-2xl sm:rounded-[22px] bg-gradient-to-b from-white to-neutral-50/30 shadow-3xs p-5 sm:p-6 space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[14px] grid place-items-center bg-emerald-50 border border-emerald-200/60 text-emerald-600 shrink-0">
            <Shield size={18} />
          </div>
          <div>
            <h2 className="font-display text-[.95rem] font-black text-ink-950 tracking-tight leading-tight">
              Sistem Dana Aman
            </h2>
            <p className="text-[.78rem] text-ink-400 font-semibold mt-0.5">
              Bagaimana Marketiv mengamankan dana kolaborasi Anda hingga pekerjaan selesai.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[.72rem] font-[800] border border-emerald-200/60 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          Dana Terlindungi
        </span>
      </div>

      {/* Mobile stacked steps */}
      <div className="grid grid-cols-1 gap-2.5 sm:hidden">
        {ESCROW_FLOW_STEPS.map((step) => (
          <div key={step.number} className="flex min-w-0 items-start gap-3 rounded-2xl border border-neutral-200/60 bg-neutral-50/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-white text-xs font-extrabold text-primary shadow-3xs">
              {step.number}
            </div>
            <div className="min-w-0 space-y-0.5">
              <h4 className="text-[11px] font-extrabold leading-snug text-ink-700">{step.title}</h4>
              <p className="text-[9.5px] leading-relaxed text-ink-400">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop stepper diagram */}
      <div className="relative hidden select-none rounded-2xl border border-neutral-200/60 bg-neutral-50/50 p-5 sm:block">
        <div className="grid grid-cols-4 items-start gap-4">
          {ESCROW_FLOW_STEPS.map((step, idx) => (
            <div key={step.number} className="relative flex min-w-0 flex-col items-center text-center">
              {/* Connector line */}
              {idx < ESCROW_FLOW_STEPS.length - 1 && (
                <div className="absolute top-4.5 left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] h-0.5 bg-gradient-to-r from-primary/30 to-primary/10" />
              )}

              {/* Step Circle */}
              <div className="w-10 h-10 rounded-full bg-white border-2 border-primary/25 text-primary flex items-center justify-center font-extrabold text-xs shadow-3xs shrink-0 z-10 transition-all hover:border-primary hover:scale-110 duration-300">
                {step.number}
              </div>

              {/* Step Label */}
              <div className="mt-2.5 space-y-0.5 max-w-[150px]">
                <h4 className="text-[11px] font-extrabold text-ink-700 leading-snug">{step.title}</h4>
                <p className="text-[9.5px] text-ink-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail breakdown — Campaign vs Rate Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Campaign Mode */}
        <div className="flex items-start gap-4 rounded-2xl border border-neutral-200/60 bg-gradient-to-b from-white to-orange-50/20 p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="w-10 h-10 rounded-[14px] bg-orange-50 border border-orange-200/60 grid place-items-center shrink-0 text-orange-600">
            <Megaphone size={18} />
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <h4 className="text-[.84rem] font-black text-ink-900 tracking-tight">Mode Kampanye (Bayar per Tayangan)</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200/60 text-[10px] font-extrabold text-orange-700">{feeLabel}</span>
            </div>
            <p className="text-[.74rem] text-ink-400 leading-relaxed font-medium">
              Bayar per tayangan. Anggaran kampanye disimpan di awal dan dikenakan {feeDisclosure} (dibebankan ke UMKM). Dana imbalan dicairkan ke kreator sebanding dengan tayangan postingan yang valid.
            </p>
            <div className="flex flex-col gap-1 pt-1 text-xs sm:flex-row sm:items-center sm:justify-between border-t border-dashed border-neutral-200/60 mt-1">
              <span className="text-ink-400 font-semibold">Dana Aman Kampanye</span>
              <strong className="font-display font-black text-ink-900 tracking-tight">{formatCurrency(overview.campaignEscrow)}</strong>
            </div>
          </div>
        </div>

        {/* Rate Card Mode */}
        <div className="flex items-start gap-4 rounded-2xl border border-neutral-200/60 bg-gradient-to-b from-white to-blue-50/20 p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="w-10 h-10 rounded-[14px] bg-blue-50 border border-blue-200/60 grid place-items-center shrink-0 text-blue-600">
            <MessageSquare size={18} />
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <h4 className="text-[.84rem] font-black text-ink-900 tracking-tight">Mode Paket Harga</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 text-[10px] font-extrabold text-blue-700">{feeLabel}</span>
            </div>
            <p className="text-[.74rem] text-ink-400 leading-relaxed font-medium">
              Harga tetap dan negosiasi langsung. Dana pesanan disimpan 100% di Dana Aman ({feeLabel.toLowerCase()} ditanggung kreator). Dana dicairkan setelah tautan Postingan Bersama terverifikasi.
            </p>
            <div className="flex flex-col gap-1 pt-1 text-xs sm:flex-row sm:items-center sm:justify-between border-t border-dashed border-neutral-200/60 mt-1">
              <span className="text-ink-400 font-semibold">Dana Aman Paket Harga</span>
              <strong className="font-display font-black text-ink-900 tracking-tight">{formatCurrency(overview.rateCardEscrow)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Escrow summary numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3.5 bg-gradient-to-b from-orange-50/60 to-white rounded-2xl border border-orange-200/40 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <span className="text-[9px] font-extrabold text-ink-400 uppercase tracking-wider block">Total Dana Aman Aktif</span>
          <strong className="mt-1.5 block break-words font-display text-sm font-black text-primary tracking-tight">{formatCurrency(overview.activeEscrow)}</strong>
        </div>
        <div className="p-3.5 bg-gradient-to-b from-neutral-50 to-white rounded-2xl border border-neutral-200/60 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <span className="text-[9px] font-extrabold text-ink-400 uppercase tracking-wider block">Menunggu Rilis</span>
          <strong className="mt-1.5 block break-words font-display text-sm font-black text-ink-900 tracking-tight">{formatCurrency(overview.pendingRelease)}</strong>
        </div>
        <div className="p-3.5 bg-gradient-to-b from-neutral-50 to-white rounded-2xl border border-neutral-200/60 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <span className="text-[9px] font-extrabold text-ink-400 uppercase tracking-wider block">Dapat Dikembalikan</span>
          <strong className="mt-1.5 block break-words font-display text-sm font-black text-ink-900 tracking-tight">{formatCurrency(overview.refundEligible)}</strong>
        </div>
      </div>
    </div>
  );
}
