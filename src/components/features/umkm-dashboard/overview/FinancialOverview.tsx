"use client";

import { Shield, Clock, TrendingUp, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface FinancialOverviewProps {
  isLoading?: boolean;
  escrowBalance?: number;
  totalSpend?: number;
  pendingValidation?: number;
  onViewFinanceClick?: () => void;
}

export function FinancialOverview({
  isLoading = false,
  escrowBalance,
  totalSpend,
  pendingValidation,
  onViewFinanceClick,
}: FinancialOverviewProps) {
  const items = [
    {
      icon: Shield,
      label: "Saldo Dana Aman",
      value: escrowBalance !== undefined ? formatCurrency(escrowBalance) : "—",
      note: "Dana ditahan sementara",
      color: "#d97706",
      bg: "radial-gradient(circle at 100% 0%, rgba(217,119,6,.10), transparent 8rem), linear-gradient(180deg, #ffffff, #fffbeb)",
      iconBg: "#fffbeb",
      border: "rgba(217,119,6,.15)",
      highlight: true,
    },
    {
      icon: Clock,
      label: "Menunggu Verifikasi",
      value: pendingValidation !== undefined ? `${pendingValidation} Bukti Konten` : "—",
      note: "Bukti Konten",
      color: "#2563eb",
      bg: "radial-gradient(circle at 100% 0%, rgba(37,99,235,.08), transparent 8rem), linear-gradient(180deg, #ffffff, #f0f6ff)",
      iconBg: "#f0f6ff",
      border: "rgba(37,99,235,.10)",
      highlight: false,
    },
    {
      icon: TrendingUp,
      label: "Total Pengeluaran",
      value: totalSpend !== undefined ? formatCurrency(totalSpend) : "—",
      note: "Sejak bergabung",
      color: "#ea580c",
      bg: "radial-gradient(circle at 100% 0%, rgba(234,88,12,.08), transparent 8rem), linear-gradient(180deg, #ffffff, #fff7ed)",
      iconBg: "#fff7ed",
      border: "rgba(234,88,12,.10)",
      highlight: false,
    },
  ];

  return (
    <div
      className="relative rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)] h-full flex flex-col justify-between overflow-hidden"
    >
      <div className="flex flex-col h-full justify-between">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block mb-0.5">
              RINGKASAN KEUANGAN
            </span>
            <h3 className="text-base font-black text-slate-900 tracking-tight font-display">
              Status Dana & Transaksi
            </h3>
          </div>

          <button
            type="button"
            onClick={onViewFinanceClick}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-orange-600 transition-colors cursor-pointer shrink-0"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Finance grid */}
        {isLoading ? (
          <div className="grid gap-2.5 flex-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-2xl bg-slate-50 space-y-2">
                <div className="w-1/3 h-3 rounded bg-slate-200 animate-pulse" />
                <div className="w-2/3 h-5 rounded bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 flex-1 justify-between">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="hover-card-animate p-3 rounded-2xl border transition-all flex-1 flex flex-col justify-between overflow-hidden min-h-0"
                  style={{
                    background: item.bg,
                    borderColor: item.border,
                  }}
                >
                  {/* Top row inside card: Label + Note */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
                      {item.label}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 whitespace-nowrap"
                      style={{
                        background: item.highlight ? "rgba(255,255,255,0.75)" : "rgba(241,245,249,0.8)",
                        border: item.highlight ? `1px solid ${item.border}` : "1px solid rgba(17,24,39,0.06)",
                        color: item.highlight ? item.color : "#64748b",
                      }}
                    >
                      {item.note}
                    </span>
                  </div>

                  {/* Main value row: Icon + Number */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg grid place-items-center shrink-0 border"
                      style={{
                        background: item.iconBg,
                        borderColor: item.border,
                      }}
                    >
                      <Icon size={14} color={item.color} />
                    </div>
                    <div
                      className="font-display font-black text-slate-900 text-xs sm:text-sm tracking-tight truncate min-w-0"
                      style={{
                        color: item.highlight ? item.color : "#0f172a",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


