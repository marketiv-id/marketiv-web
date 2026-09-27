"use client";

import {
  DollarSign,
  Shield,
  Clock,
  CornerDownLeft,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import { UmkmFinanceSummary } from "@/types/umkm-dashboard.types";
import { formatCompactCurrency, formatCompactNumber, formatCurrency } from "@/lib/formatters";

interface SummaryCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  note: string;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
}

function SummaryCard({ icon: Icon, label, value, note, iconBg, iconColor, iconBorder }: SummaryCardProps) {
  return (
    <div className="relative min-w-0 p-3.5 sm:p-4.5 border border-neutral-200/80 rounded-2xl sm:rounded-[22px] bg-gradient-to-b from-white to-neutral-50/50 shadow-3xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary-500/20 group">
      <div className="flex items-center justify-between gap-3 mb-2.5 sm:mb-3.5">
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-[14px] grid place-items-center border shadow-3xs transition-transform duration-300 group-hover:scale-105"
          style={{ background: iconBg, borderColor: iconBorder, color: iconColor }}
        >
          <div className="block sm:hidden"><Icon size={14} /></div>
          <div className="hidden sm:block"><Icon size={18} /></div>
        </div>
      </div>

      <div className="text-[0.66rem] sm:text-[0.74rem] font-extrabold text-neutral-500 tracking-wide uppercase">
        {label}
      </div>
      <div className="font-display text-[1.2rem] sm:text-[1.4rem] lg:text-[1.55rem] font-black text-neutral-900 tracking-tight leading-none mt-1 sm:mt-1.5 break-all">
        {value}
      </div>
      <div className="text-[0.68rem] sm:text-[0.74rem] text-neutral-400 font-semibold mt-1 sm:mt-1.5 leading-none">
        {note}
      </div>
    </div>
  );
}

interface FinanceSummaryCardsProps {
  summary: UmkmFinanceSummary;
}

export function FinanceSummaryCards({ summary }: FinanceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
      <SummaryCard
        icon={DollarSign}
        label="Total Pengeluaran"
        value={formatCompactCurrency(summary.totalExpenses)}
        note={formatCurrency(summary.totalExpenses)}
        iconBg="#fff7ed"
        iconColor="#ea580c"
        iconBorder="rgba(234,88,12,.18)"
      />
      <SummaryCard
        icon={Shield}
        label="Dana Aman Tersimpan"
        value={formatCompactCurrency(summary.escrowBalance)}
        note={formatCurrency(summary.escrowBalance)}
        iconBg="#f0f6ff"
        iconColor="#2563eb"
        iconBorder="rgba(37,99,235,.18)"
      />
      <SummaryCard
        icon={Clock}
        label="Perlu Dibayar"
        value={formatCompactCurrency(summary.pendingPayments)}
        note={formatCurrency(summary.pendingPayments)}
        iconBg="#fffbeb"
        iconColor="#d97706"
        iconBorder="rgba(217,119,6,.18)"
      />
      <SummaryCard
        icon={CornerDownLeft}
        label="Pengembalian Dana Diterima"
        value={formatCompactCurrency(summary.refundsReceived)}
        note={formatCurrency(summary.refundsReceived)}
        iconBg="#f1fbf5"
        iconColor="#16a34a"
        iconBorder="rgba(22,163,74,.18)"
      />
      <SummaryCard
        icon={BarChart3}
        label="Biaya Platform"
        value={formatCompactCurrency(summary.platformFees)}
        note={formatCurrency(summary.platformFees)}
        iconBg="#f7f3ff"
        iconColor="#7c3aed"
        iconBorder="rgba(124,58,237,.18)"
      />
      <SummaryCard
        icon={ClipboardCheck}
        label="Transaksi Sukses"
        value={formatCompactNumber(summary.successfulTransactionsCount)}
        note={`${formatCompactNumber(summary.successfulTransactionsCount)} transaksi`}
        iconBg="#f1fbf5"
        iconColor="#16a34a"
        iconBorder="rgba(22,163,74,.18)"
      />
      {summary.isTruncated && (
        <div className="col-span-full mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-sm font-semibold text-amber-700">
            Sebagian data di atas adalah estimasi (mencapai batas maksimal sistem 5000 data).
          </p>
        </div>
      )}
    </div>
  );
}
