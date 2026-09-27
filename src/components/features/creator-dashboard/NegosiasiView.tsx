"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SearchToolbar, type SearchToolbarFilter } from "@/components/features/dashboard/shared";
import { CreatorNegotiation } from "@/types/creator-dashboard";
import { CreatorPageHeader } from "./CreatorPageHeader";
import { CreatorEmptyState } from "./CreatorEmptyState";
import { formatCurrency } from "@/lib/formatters";
import { getOrderStatusLabel } from "@/lib/dashboard-labels";
import { calculatePlatformFee } from "@/types/domain";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  ShieldCheck,
  ClipboardCheck,
  Tag,
  Hourglass,
  Clock,
  Archive,
  ArchiveRestore,
  Sparkles,
  ArrowRight,
  User,
} from "lucide-react";
import { setConversationArchived } from "@/services/shared/conversation.service";
import { getCreatorNegotiations } from "@/services/creator/creator-dashboard.service";
import { CreatorPageSkeleton } from "./CreatorPageSkeleton";
import { toast } from "sonner";

const CREATOR_ACTION_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-600), var(--color-kreator-action-end))";

// ─── MetricTile ───────────────────────────────────────────────────────────────

interface MetricTileProps {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ReactNode;
  iconClass: string;
  cardClass?: string;
  badge?: string;
  badgeClass?: string;
}

function MetricTile({ label, value, helper, icon, iconClass, cardClass, badge, badgeClass }: MetricTileProps) {
  return (
    <div
      className={cn(
        "group relative p-4 sm:p-5 rounded-2xl sm:rounded-[22px] border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(15,23,42,.08)] select-none cursor-default",
        cardClass ?? "border-slate-200/70 shadow-xs"
      )}
    >
      {badge && (
        <div className="absolute top-3.5 right-3.5">
          <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider shadow-3xs", badgeClass)}>
            {badge}
          </span>
        </div>
      )}
      <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center mb-3 border transition-transform duration-300 group-hover:scale-105 shadow-3xs", iconClass)}>
        {icon}
      </div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">{label}</div>
      <div className="font-display text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none mt-1.5">{value}</div>
      <div className="text-xs text-slate-500 font-medium mt-1 leading-none">{helper}</div>
    </div>
  );
}

// ─── NegotiationCard ─────────────────────────────────────────────────────────

type StageStyle = { dot: string; text: string; bg: string; border: string };

const STATUS_STYLES: Record<string, StageStyle> = {
  chatting:        { dot: "bg-slate-400",   text: "text-slate-700",   bg: "bg-slate-100",   border: "border-slate-200" },
  offer_pending:   { dot: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200" },
  offer_rejected:  { dot: "bg-rose-500",    text: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200" },
  awaiting_order:  { dot: "bg-indigo-500",  text: "text-indigo-700",  bg: "bg-indigo-50",  border: "border-indigo-200" },
  pending_payment: { dot: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200" },
  escrow:          { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  in_progress:     { dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" },
  revision:        { dot: "bg-orange-500",  text: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200" },
  approved:        { dot: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200" },
  completed:       { dot: "bg-emerald-600", text: "text-emerald-800", bg: "bg-emerald-50", border: "border-emerald-200" },
  cancelled:       { dot: "bg-slate-400",   text: "text-slate-600",   bg: "bg-slate-100",  border: "border-slate-200" },
};

const UNKNOWN_STAGE_STYLE: StageStyle = {
  dot: "bg-slate-400",
  text: "text-slate-600",
  bg: "bg-slate-100",
  border: "border-slate-200",
};

function NegotiationCard({
  neg,
  isArchived,
  isToggling,
  onToggleArchive,
}: {
  neg: CreatorNegotiation;
  isArchived: boolean;
  isToggling: boolean;
  onToggleArchive: () => void;
}) {
  const s = STATUS_STYLES[neg.stage] ?? UNKNOWN_STAGE_STYLE;
  const stageLabel = getOrderStatusLabel(neg.stage);
  const dateStr = new Date(neg.lastMessageAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const hasUrgent = neg.unreadCount > 0;
  const earningsAmount = neg.totalAmount ?? (neg.finalPrice - calculatePlatformFee(neg.finalPrice));
  const hasProjectTitle = Boolean(neg.projectTitle && neg.projectTitle.trim());
  const cleanLastMessage = neg.lastMessage ? neg.lastMessage.trim() : "";

  return (
    <div
      className={cn(
        "group relative bg-white rounded-2xl sm:rounded-[22px] border transition-all duration-300",
        "p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4",
        hasUrgent
          ? "border-violet-300 shadow-[0_4px_24px_rgba(124,58,237,.08)] ring-1 ring-violet-200/60"
          : "border-slate-200/70 shadow-2xs hover:shadow-md hover:border-violet-200/80 hover:-translate-y-0.5"
      )}
    >
      {/* Unread top indicator strip */}
      {hasUrgent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-t-[22px]" />
      )}

      {/* Left section: Avatar + Info */}
      <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
        {/* Avatar with unread badge */}
        <div className="relative shrink-0 mt-0.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center font-black text-slate-400 text-lg shadow-3xs overflow-hidden">
            {neg.umkmAvatarUrl ? (
              <img
                src={neg.umkmAvatarUrl}
                alt={neg.umkmName}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="font-display text-slate-500 font-black text-base sm:text-lg">
                {neg.umkmName ? neg.umkmName.charAt(0).toUpperCase() : <User className="w-5 h-5 text-slate-400" />}
              </span>
            )}
          </div>
          {hasUrgent && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-violet-600 rounded-full text-white font-black text-[10px] flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
              {neg.unreadCount > 9 ? "9+" : neg.unreadCount}
            </span>
          )}
        </div>

        {/* Content body */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header row: Name + Stage badge + Date on mobile */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-display font-black text-slate-900 text-sm sm:text-base group-hover:text-violet-700 transition-colors truncate">
                {neg.umkmName || "Merek UMKM"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border shadow-3xs",
                  s.text,
                  s.bg,
                  s.border
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
                {stageLabel}
              </span>
            </div>

            {/* Date time on top right */}
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{dateStr}</span>
            </div>
          </div>

          {/* Project title */}
          {hasProjectTitle ? (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700">
              <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />
              <span className="truncate">{neg.projectTitle}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Diskusi Paket &amp; Kebutuhan Konten</span>
            </div>
          )}

          {/* Last message preview */}
          {cleanLastMessage ? (
            <p className="text-xs text-slate-600 font-medium line-clamp-1 bg-slate-50/80 border border-slate-100 rounded-lg px-2.5 py-1 leading-relaxed">
              &ldquo;{cleanLastMessage}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">Belum ada pesan terbaru</p>
          )}
        </div>
      </div>

      {/* Right section: Price earnings + Action buttons */}
      <div className="flex md:flex-row items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
        {/* Earnings info box */}
        <div className="flex flex-col md:items-end justify-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Anda Terima
          </span>
          <span className="font-display font-black text-sm sm:text-base text-violet-700 tracking-tight leading-snug">
            {formatCurrency(earningsAmount)}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleArchive}
            disabled={isToggling}
            title={isArchived ? "Kembalikan ke kotak masuk" : "Arsipkan percakapan"}
            aria-label={isArchived ? "Kembalikan ke kotak masuk" : "Arsipkan percakapan"}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50/30 transition-all cursor-pointer shadow-3xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isToggling ? (
              <span className="w-4 h-4 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin" />
            ) : isArchived ? (
              <ArchiveRestore className="w-4 h-4" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
          </button>

          <Link
            href={`/dashboard/kreator/negosiasi/${neg.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_4px_14px_rgba(124,58,237,0.25)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.35)]"
            style={{
              background: CREATOR_ACTION_GRADIENT,
            }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Buka Ruang</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NegosiasiView() {
  const [negotiations, setNegotiations] = useState<CreatorNegotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  const handleToggleArchive = async (neg: CreatorNegotiation) => {
    if (togglingId === neg.conversationId) return;
    const next = !neg.isArchived;
    setTogglingId(neg.conversationId);
    const res = await setConversationArchived(neg.conversationId, next);
    setTogglingId(null);
    if (!res.success) {
      toast.error(res.error ?? "Gagal mengubah status arsip.");
      return;
    }
    setNegotiations((prev) =>
      prev.map((n) => (n.conversationId === neg.conversationId ? { ...n, isArchived: next } : n))
    );
    toast.success(next ? "Percakapan diarsipkan." : "Percakapan dikembalikan ke kotak masuk.");
  };

  const loadNegotiations = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getCreatorNegotiations();
    if (res.success && res.data) {
      setNegotiations(res.data);
    } else {
      setError(res.error ?? "Gagal memuat daftar negosiasi.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadNegotiations();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadNegotiations]);

  const handleClearFilters = () => {
    setSearch("");
    setSelectedStatus("all");
    setSortBy("latest");
  };

  const NEGOTIATING_STAGES = ["chatting", "offer_pending", "offer_rejected", "awaiting_order"];
  const ESCROW_STAGES = ["escrow", "in_progress", "revision", "approved"];

  const countNegotiation    = negotiations.filter((n) => NEGOTIATING_STAGES.includes(n.stage)).length;
  const countPendingPayment = negotiations.filter((n) => n.stage === "pending_payment").length;
  const countEscrow         = negotiations.filter((n) => ESCROW_STAGES.includes(n.stage)).length;
  const countCompleted      = negotiations.filter((n) => n.stage === "completed").length;
  const totalUnread         = negotiations.reduce((acc, n) => acc + (n.unreadCount || 0), 0);

  const filteredNegotiations = negotiations
    .filter((n) => {
      const matchesSearch =
        n.umkmName.toLowerCase().includes(search.toLowerCase()) ||
        n.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
        n.lastMessage.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "negosiasi" && NEGOTIATING_STAGES.includes(n.stage)) ||
        (selectedStatus === "menunggu-pembayaran" && n.stage === "pending_payment") ||
        (selectedStatus === "escrow" && ESCROW_STAGES.includes(n.stage)) ||
        (selectedStatus === "selesai" && n.stage === "completed");

      const isArchived = n.isArchived;

      return matchesSearch && matchesStatus && isArchived === showArchived;
    })
    .sort((a, b) => {
      if (sortBy === "deadline") return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (sortBy === "price_desc") return (b.totalAmount ?? b.finalPrice) - (a.totalAmount ?? a.finalPrice);
      if (sortBy === "unread") return b.unreadCount - a.unreadCount;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

  const hasActiveFilters = search !== "" || selectedStatus !== "all";
  const toolbarFilters: SearchToolbarFilter[] = [
    {
      label: "Status",
      value: selectedStatus,
      onChange: setSelectedStatus,
      options: [
        { value: "all", label: "Semua Status" },
        { value: "negosiasi", label: "Negosiasi" },
        { value: "menunggu-pembayaran", label: "Menunggu Pembayaran" },
        { value: "escrow", label: "Dana Aman" },
        { value: "selesai", label: "Selesai" },
      ],
    },
    {
      label: "Urutan",
      value: sortBy,
      onChange: setSortBy,
      options: [
        { value: "latest", label: "Terbaru" },
        { value: "deadline", label: "Batas Waktu Terdekat" },
        { value: "price_desc", label: "Harga Tertinggi" },
        { value: "unread", label: "Belum Dibaca" },
      ],
      prefix: "Urut",
    },
  ];

  const archivedCount = negotiations.filter((n) => n.isArchived).length;

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <CreatorPageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center min-h-[50vh]">
        <CreatorEmptyState
          title="Gagal memuat negosiasi"
          description={error}
          actionButton={
            <button
              onClick={() => void loadNegotiations()}
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

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 relative">
      <div>
        <CreatorPageHeader
          title="Negosiasi Paket Harga"
          description="Kelola pesanan Paket Harga dari UMKM."
        />

        {/* Metric tiles — 4 cards max, 1 row on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-7">
          <MetricTile
            label="Negosiasi Aktif"
            value={countNegotiation}
            helper="Perlu respons Anda"
            iconClass="text-amber-600 bg-amber-50 border-amber-200/50"
            icon={<MessageSquare className="w-5 h-5" />}
            cardClass="border-amber-200/50 shadow-xs bg-gradient-to-br from-amber-50/30 via-white to-white"
            badge={totalUnread > 0 ? `${totalUnread} belum dibaca` : undefined}
            badgeClass="bg-violet-50 border-violet-200/60 text-violet-700"
          />
          <MetricTile
            label="Menunggu Pembayaran"
            value={countPendingPayment}
            helper="Penawaran Anda disetujui"
            iconClass="text-blue-600 bg-blue-50 border-blue-200/50"
            icon={<Hourglass className="w-5 h-5" />}
            cardClass="border-blue-200/50 shadow-xs bg-gradient-to-br from-blue-50/30 via-white to-white"
          />
          <MetricTile
            label="Dana Aman"
            value={countEscrow}
            helper="Anda sedang mengerjakan"
            iconClass="text-emerald-600 bg-emerald-50 border-emerald-200/50"
            icon={<ShieldCheck className="w-5 h-5" />}
            cardClass="border-emerald-200/50 shadow-xs bg-gradient-to-br from-emerald-50/30 via-white to-white"
          />
          <MetricTile
            label="Pesanan Selesai"
            value={countCompleted}
            helper="Imbalan siap dicairkan"
            iconClass="text-violet-600 bg-violet-50 border-violet-200/50"
            icon={<ClipboardCheck className="w-5 h-5" />}
            cardClass="border-violet-200/50 shadow-xs bg-gradient-to-br from-violet-50/30 via-white to-white"
          />
        </div>

        {/* Toolbar — sticky when scrolling */}
        <div className="mb-6">
          <SearchToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Cari UMKM / judul pesanan..."
            filters={toolbarFilters}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            theme="kreator"
          />
        </div>

        {/* Tab Inbox / Arsip — Modern Segmented Control */}
        <div className="flex items-center justify-between mb-5">
          <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70 gap-1 shadow-3xs">
            <button
              onClick={() => setShowArchived(false)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer",
                !showArchived
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
              <span>Kotak Masuk</span>
              {negotiations.filter((n) => !n.isArchived).length > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black",
                  !showArchived ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-600"
                )}>
                  {negotiations.filter((n) => !n.isArchived).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowArchived(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer",
                showArchived
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>Arsip</span>
              {archivedCount > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black",
                  showArchived ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-600"
                )}>
                  {archivedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Negotiation cards */}
        {filteredNegotiations.length === 0 ? (
          <CreatorEmptyState
            title={showArchived ? "Tidak ada percakapan diarsipkan" : "Belum ada negosiasi Paket Harga"}
            description={
              showArchived
                ? "Percakapan yang Anda arsipkan akan muncul di sini."
                : hasActiveFilters
                ? "Tidak ada negosiasi yang cocok dengan filter pencarian Anda."
                : "Belum ada obrolan negosiasi dari UMKM untuk Paket Harga Anda."
            }
            actionButton={
              hasActiveFilters ? (
                <button
                  onClick={handleClearFilters}
                  className="text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow border border-transparent cursor-pointer"
                  style={{ background: CREATOR_ACTION_GRADIENT, boxShadow: "var(--shadow-kreator)" }}
                >
                  Reset Filter
                </button>
              ) : null
            }
          />
        ) : (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-300">
            {filteredNegotiations.map((neg) => (
              <NegotiationCard
                key={neg.id}
                neg={neg}
                isArchived={neg.isArchived}
                isToggling={togglingId === neg.conversationId}
                onToggleArchive={() => handleToggleArchive(neg)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
