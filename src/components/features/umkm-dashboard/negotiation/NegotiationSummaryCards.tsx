"use client";

import { MessageSquare, CreditCard, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { NegotiationOrder } from "@/types/umkm-dashboard.types";

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

interface NegotiationSummaryCardsProps {
  negotiations: NegotiationOrder[];
}

export function NegotiationSummaryCards({ negotiations }: NegotiationSummaryCardsProps) {
  const negotiatingStages = ["chatting", "offer_pending", "offer_rejected", "awaiting_order"];
  const escrowStatuses = ["escrow", "in_progress", "revision", "approved"];

  const activeCount = negotiations.filter((n) => negotiatingStages.includes(n.stage)).length;
  const waitingPaymentCount = negotiations.filter((n) => n.stage === "pending_payment").length;
  // TODO(P1): escrow locked value should come from backend payment state, not UI inference from order stage
  const escrowCount = negotiations.filter((n) => escrowStatuses.includes(n.stage)).length;
  const completedCount = negotiations.filter((n) => n.stage === "completed").length;
  const cancelledCount = negotiations.filter((n) => n.stage === "cancelled").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      <SummaryCard
        icon={MessageSquare}
        label="Negosiasi Aktif"
        value={String(activeCount)}
        note="Perlu tanggapan"
        iconBg="#fff7ed"
        iconColor="#ea580c"
        iconBorder="rgba(234,88,12,.18)"
      />
      <SummaryCard
        icon={CreditCard}
        label="Perlu Dibayar"
        value={String(waitingPaymentCount)}
        note="Tawaran disetujui"
        iconBg="#fffbeb"
        iconColor="#d97706"
        iconBorder="rgba(217,119,6,.18)"
      />
      <SummaryCard
        icon={Lock}
        label="Dalam Dana Aman"
        value={String(escrowCount)}
        note="Proyek berjalan aman"
        iconBg="#f1fbf5"
        iconColor="#16a34a"
        iconBorder="rgba(22,163,74,.18)"
      />
      <SummaryCard
        icon={CheckCircle}
        label="Selesai"
        value={String(completedCount)}
        note="Kerja sama sukses"
        iconBg="#f0f6ff"
        iconColor="#2563eb"
        iconBorder="rgba(37,99,235,.18)"
      />
      <SummaryCard
        icon={AlertTriangle}
        label="Dibatalkan"
        value={String(cancelledCount)}
        note="Sudah Dibatalkan"
        iconBg="#f8fafc"
        iconColor="#64748b"
        iconBorder="rgba(100,116,139,.18)"
      />
    </div>
  );
}
