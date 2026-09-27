"use client";

import { useState } from "react";
import {
  ClipboardList,
  BadgeDollarSign,
  ShoppingBag,
  Clock,
  RotateCcw,
  Box,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Crown,
  Tag,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { CreatorRateCardPackage } from "@/types/creator-dashboard";
import { CreatorPageHeader } from "./CreatorPageHeader";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { formatCurrency } from "@/lib/formatters";
import { getRateCardStatusLabel } from "@/lib/dashboard-labels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { rateCardPackageSchema } from "@/lib/validations/rate-card.schema";
import { parseOrErrors } from "@/lib/validations/to-field-errors";
import {
  createRateCardPackage,
  updateRateCardPackage,
  setRateCardPackageStatus,
  deleteRateCardPackage,
} from "@/services/creator/creator-dashboard.service";

// ── Metric info card — konsisten dengan palet Creator ────────────────────────

interface MetricInfoCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  note: string;
  colors: { bg: string; iconColor: string; border: string };
  badge?: { text: string; cls: string };
}

function MetricInfoCard({ icon: Icon, label, value, note, colors, badge }: MetricInfoCardProps) {
  return (
    <div className="relative min-w-0 p-4 sm:p-5 border border-slate-200/80 rounded-2xl sm:rounded-3xl bg-white shadow-[0_4px_16px_rgba(15,23,42,.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-violet-500/30 group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl grid place-items-center border shadow-xs transition-transform duration-300 group-hover:scale-105 shrink-0"
          style={{ background: colors.bg, borderColor: colors.border, color: colors.iconColor }}
        >
          <Icon size={18} />
        </div>
        {badge && (
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.62rem] font-black uppercase tracking-wider border shrink-0", badge.cls)}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="text-[0.68rem] sm:text-[0.72rem] font-extrabold text-slate-400 tracking-wide uppercase leading-none">
        {label}
      </div>
      <div
        className="font-display font-black text-slate-900 tracking-tight leading-tight mt-1.5 break-words"
        style={{ fontSize: "clamp(1.1rem, 2.2vw, 1.4rem)" }}
      >
        {value}
      </div>
      <div className="text-[0.68rem] sm:text-[0.72rem] text-slate-500 font-medium mt-1.5 leading-none">
        {note}
      </div>
    </div>
  );
}

const MAX_PACKAGES = 3;

type Platform = "tiktok" | "instagram" | "youtube" | "all";

// ── Platform config ──────────────────────────────────────────────────────────

const PLATFORM: Record<
  Platform,
  { label: string; badgeCls: string; stripeCls: string; icon: React.ReactNode }
> = {
  tiktok: {
    label: "TikTok",
    badgeCls: "bg-slate-900 text-white border-slate-700",
    stripeCls: "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600",
    icon: (
      <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm4.3 9.4a3.8 3.8 0 0 1-2.1-.6v4a3.5 3.5 0 1 1-3.5-3.5 3.4 3.4 0 0 1 1.7.5v-2.3a5.5 5.5 0 0 0-1.7-.3 5.5 5.5 0 1 0 5.5 5.5v-5.6a5.7 5.7 0 0 0 3.2.9v-2.1a3.6 3.6 0 0 1-3.1-.5z" />
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    badgeCls: "bg-pink-50 text-pink-700 border-pink-200",
    stripeCls: "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500",
    icon: (
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
  youtube: {
    label: "YouTube",
    badgeCls: "bg-red-50 text-red-700 border-red-200",
    stripeCls: "bg-red-600",
    icon: (
      <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  all: {
    label: "Semua Platform",
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200",
    stripeCls: "bg-gradient-to-r from-blue-500 to-indigo-500",
    icon: (
      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
};

function PlatformBadge({ platform }: { platform?: Platform }) {
  const cfg = PLATFORM[platform ?? "all"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider shadow-2xs", cfg.badgeCls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Empty Placeholder Card for Rate Card ─────────────────────────────────────

const EMPTY_RATE_CARD_VARIANTS = [
  {
    badge: "Slot Paket 1",
    icon: Sparkles,
    iconBg: "bg-violet-50 text-violet-600 border-violet-200/70",
    title: "Buat Paket Standar",
    desc: "Tawarkan 1 konten video TikTok/IG Reels dengan konsep ulasan produk atau dukungan cepat.",
    btnLabel: "Buat Paket",
  },
  {
    badge: "Slot Paket 2",
    icon: Layers,
    iconBg: "bg-blue-50 text-blue-600 border-blue-200/70",
    title: "Paket Gabungan Konten",
    desc: "Tingkatkan nilai pesanan dengan menggabungkan 2-3 video promosi berkala untuk jangkauan maksimal.",
    btnLabel: "Tambah Paket Gabungan",
  },
  {
    badge: "Slot Paket 3",
    icon: Crown,
    iconBg: "bg-indigo-50 text-indigo-600 border-indigo-200/70",
    title: "Paket Eksklusif + Kolaborasi",
    desc: "Paket premium mencakup Postingan Kolaborasi resmi, hak siar promosi, dan tautan bio profil.",
    btnLabel: "Tambah Paket Premium",
  },
];

interface EmptyPlaceholderRateCardProps {
  variantIndex?: number;
  onCreateClick: () => void;
}

function EmptyPlaceholderRateCard({ variantIndex = 0, onCreateClick }: EmptyPlaceholderRateCardProps) {
  const variant = EMPTY_RATE_CARD_VARIANTS[variantIndex % EMPTY_RATE_CARD_VARIANTS.length];
  const Icon = variant.icon;

  return (
    <div className="group relative flex flex-col justify-between h-full rounded-2xl sm:rounded-3xl border border-dashed border-slate-300/90 bg-slate-50/60 p-5 sm:p-6 shadow-xs hover:border-violet-300 hover:bg-violet-50/20 transition-all duration-300 min-h-[420px]">
      <div className="space-y-4">
        {/* Top badge + icon */}
        <div className="flex items-center justify-between">
          <div className={cn("h-11 w-11 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-105 duration-300 shadow-2xs", variant.iconBg)}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-slate-500 border border-slate-200 bg-white shadow-3xs">
            {variant.badge}
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          <h4 className="font-display font-black text-slate-900 text-base sm:text-lg leading-snug tracking-tight">
            {variant.title}
          </h4>
          <p className="text-xs font-medium text-slate-500 leading-relaxed">
            {variant.desc}
          </p>
        </div>

        {/* Feature points preview */}
        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/60 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            <span>Postingan Kolaborasi &amp; Harga Tetap</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Pembayaran dijamin Dana Aman (dana ditahan sementara)</span>
          </div>
        </div>
      </div>

      <div className="pt-4 mt-auto border-t border-dashed border-slate-200">
        <button
          type="button"
          onClick={onCreateClick}
          className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-white hover:bg-slate-100/90 text-violet-700 hover:text-violet-800 border border-violet-200/80 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:border-violet-300 cursor-pointer"
        >
          <Plus size={15} />
          <span>{variant.btnLabel}</span>
        </button>
      </div>
    </div>
  );
}

// ── Package card ─────────────────────────────────────────────────────────────

interface PackageCardProps {
  pkg: CreatorRateCardPackage;
  onToggle: (pkg: CreatorRateCardPackage) => void;
  onEdit: (pkg: CreatorRateCardPackage) => void;
  onDelete: (pkg: CreatorRateCardPackage) => void;
  busy?: boolean;
}

function PackageCard({ pkg, onToggle, onEdit, onDelete, busy }: PackageCardProps) {
  const p: Platform = "tiktok";
  const cfg = PLATFORM[p];
  const isPublished = pkg.status === "published";
  const statusLabel = getRateCardStatusLabel(pkg.status);

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl overflow-hidden border bg-white transition-all duration-300",
        "shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_36px_rgba(124,58,237,0.1)] hover:border-violet-300 hover:-translate-y-1",
        isPublished ? "border-slate-200/90" : "border-slate-200/60 opacity-75"
      )}
    >
      {/* Platform accent stripe */}
      <div className={cn("h-1.5 w-full shrink-0", cfg.stripeCls)} />

      <div className="flex flex-col flex-1 p-5 sm:p-6 gap-4">

        {/* Header: platform badge + status toggle */}
        <div className="flex items-center justify-between gap-2">
          <PlatformBadge platform={p} />
          <button
            onClick={() => onToggle(pkg)}
            disabled={busy}
            aria-label={isPublished ? "Jadikan draf" : "Tayangkan paket"}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer select-none transition-all duration-200 shrink-0 disabled:opacity-50",
              isPublished
                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isPublished ? "bg-emerald-500" : "bg-slate-400")} />
            {statusLabel}
          </button>
        </div>

        {/* Title */}
        <h4 className="font-display font-black text-slate-900 group-hover:text-violet-700 transition-colors duration-200 text-base sm:text-lg leading-snug tracking-tight line-clamp-2">
          {pkg.name}
        </h4>

        {/* Price chip with Creator-harmonious gradient */}
        <div className={cn(
          "rounded-2xl px-4 py-3.5 border transition-all duration-200",
          isPublished
            ? "bg-gradient-to-br from-violet-50/80 via-blue-50/40 to-slate-50/50 border-violet-200/80 group-hover:border-violet-300 shadow-2xs"
            : "bg-slate-50 border-slate-200/60"
        )}>
          <span className={cn("block text-[10px] font-black uppercase tracking-wider mb-1", isPublished ? "text-violet-600" : "text-slate-400")}>
            Harga Paket
          </span>
          <span
            className={cn("font-display font-black tracking-tight leading-none text-slate-900")}
            style={{ fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)" }}
          >
            {formatCurrency(pkg.price)}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
          {pkg.description}
        </p>

        {/* Spec rows */}
        <div className="border-t border-dashed border-slate-200 pt-4 space-y-2.5 flex-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 text-slate-500 font-semibold shrink-0">
              <div className="w-5 h-5 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Clock size={12} />
              </div>
              Estimasi Durasi
            </span>
            <span className="font-extrabold text-slate-800">{pkg.estimatedDays} Hari Kerja</span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 text-slate-500 font-semibold shrink-0">
              <div className="w-5 h-5 rounded-md bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
                <RotateCcw size={12} />
              </div>
              Maks. Revisi
            </span>
            <span className="font-extrabold text-slate-800">{pkg.revisionCount ?? 2}×</span>
          </div>

          <div className="flex items-start justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-slate-500 font-semibold shrink-0">
              <div className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mt-0.5">
                <Box size={12} />
              </div>
              Output / Hasil Kerja
            </span>
            <span className="font-extrabold text-slate-800 text-right line-clamp-2 max-w-[55%]">
              {pkg.deliverable}
            </span>
          </div>
        </div>

        {/* Action row */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 mt-auto border-t border-slate-100">
          <button
            onClick={() => onEdit(pkg)}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs border border-slate-200 hover:border-slate-300 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Edit3 size={13} className="text-violet-600" />
            <span>Ubah Paket</span>
          </button>
          <button
            onClick={() => onDelete(pkg)}
            className="py-2.5 px-3 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 text-rose-600 font-extrabold text-xs border border-rose-200/60 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Trash2 size={13} className="text-rose-500" />
            <span>Hapus</span>
          </button>
        </div>

      </div>
    </div>
  );
}

function ModalFrame({
  children,
  className,
  description,
  isOpen,
  onClose,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className={cn("max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xl bg-white", className)}>
        <ResponsiveModalHeader className="space-y-1.5 text-left pb-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-2 text-violet-600 text-[10px] font-black tracking-widest uppercase">
            <Tag size={13} />
            <span>Paket Harga Kreator</span>
          </div>
          <ResponsiveModalTitle className="text-xl sm:text-2xl font-black text-slate-900 font-display tracking-tight">
            {title}
          </ResponsiveModalTitle>
          {description ? (
            <ResponsiveModalDescription className="text-xs text-slate-500 font-medium">
              {description}
            </ResponsiveModalDescription>
          ) : null}
        </ResponsiveModalHeader>
        <div className="mt-4">{children}</div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

interface RateCardViewProps {
  initialPackages: CreatorRateCardPackage[];
  /** Jumlah order Rate Card masuk — agregasi backend, bukan dihitung di klien. */
  ordersCount: number;
}

export function RateCardView({ initialPackages, ordersCount }: RateCardViewProps) {
  const [packages, setPackages] = useState<CreatorRateCardPackage[]>(
    initialPackages.map((p) => ({
      ...p,
      revisionCount: p.revisionCount ?? 2,
    }))
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activePackage, setActivePackage] = useState<CreatorRateCardPackage | null>(null);

  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState(150000);
  const [formDeliverables, setFormDeliverables] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDuration, setFormDuration] = useState(3);
  const [formRevisions, setFormRevisions] = useState(2);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);

  // Derived
  const activeCount = packages.filter((p) => p.status === "published").length;
  const activePrices = packages.filter((p) => p.status === "published").map((p) => p.price);
  const startingPrice = activePrices.length > 0 ? Math.min(...activePrices) : 0;
  const isAtLimit = packages.length >= MAX_PACKAGES;

  const showToast = (msg: string) => toast.success(msg);

  const buildInput = () => ({
    name: formName.trim(),
    description: formDesc.trim(),
    output: formDeliverables.trim(),
    deliveryDays: formDuration,
    price: formPrice,
    revisionLimit: formRevisions,
    published: formIsActive,
  });

  const openCreate = () => {
    if (isAtLimit) return;
    setFormName(""); setFormPrice(150000); setFormDeliverables("");
    setFormDesc(""); setFormDuration(3); setFormRevisions(2);
    setFormIsActive(true); setFormError(null);
    setIsCreateOpen(true);
  };

  const handleToggleActive = async (pkg: CreatorRateCardPackage) => {
    const next = pkg.status === "published" ? ("draft" as const) : ("published" as const);
    setTogglingId(pkg.id);
    const res = await setRateCardPackageStatus(
      { id: pkg.id, rateCardId: pkg.rateCardId, base: pkg },
      next
    );
    setTogglingId(null);
    if (res.success && res.data) {
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? res.data! : p)));
      showToast(`Paket berhasil ${next === "published" ? "diaktifkan" : "dinonaktifkan"}!`);
    } else {
      toast.error(res.error ?? "Gagal mengubah status paket.");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseOrErrors(rateCardPackageSchema, buildInput());
    if (!parsed.ok) {
      setFormError(Object.values(parsed.errors)[0] ?? "Periksa kembali isian paket.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    const res = await createRateCardPackage({ ...parsed.data, published: formIsActive });
    setIsSubmitting(false);
    if (res.success && res.data) {
      setPackages((prev) => [...prev, res.data!]);
      setIsCreateOpen(false);
      showToast(`Paket "${res.data.name}" berhasil dibuat!`);
    } else {
      setFormError(res.error ?? "Gagal membuat paket.");
    }
  };

  const handleOpenEdit = (pkg: CreatorRateCardPackage) => {
    setActivePackage(pkg);
    setFormName(pkg.name); setFormPrice(pkg.price);
    setFormDeliverables(pkg.deliverable); setFormDesc(pkg.description);
    setFormDuration(pkg.estimatedDays); setFormRevisions(pkg.revisionCount ?? 2);
    setFormIsActive(pkg.status === "published"); setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePackage) return;
    const parsed = parseOrErrors(rateCardPackageSchema, buildInput());
    if (!parsed.ok) {
      setFormError(Object.values(parsed.errors)[0] ?? "Periksa kembali isian paket.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    const res = await updateRateCardPackage(
      { id: activePackage.id, rateCardId: activePackage.rateCardId },
      { ...parsed.data, published: formIsActive }
    );
    setIsSubmitting(false);
    if (res.success && res.data) {
      setPackages((prev) => prev.map((p) => (p.id === activePackage.id ? res.data! : p)));
      setIsEditOpen(false); setActivePackage(null);
      showToast(`Paket "${res.data.name}" berhasil diperbarui!`);
    } else {
      setFormError(res.error ?? "Gagal memperbarui paket.");
    }
  };

  const handleOpenDelete = (pkg: CreatorRateCardPackage) => {
    setActivePackage(pkg);
    setDeleteError(null);
    setDeleteBlocked(false);
    setIsDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!activePackage) return;
    setIsSubmitting(true);
    const res = await deleteRateCardPackage({
      id: activePackage.id,
      rateCardId: activePackage.rateCardId,
    });
    setIsSubmitting(false);
    if (res.success) {
      setPackages((prev) => prev.filter((p) => p.id !== activePackage.id));
      setIsDeleteOpen(false); setActivePackage(null);
      showToast("Paket Harga berhasil dihapus.");
    } else {
      setDeleteError(res.error ?? "Gagal menghapus paket.");
      setDeleteBlocked(res.code === "forbidden" || res.code === "validation");
    }
  };

  const handleMakeDraftFromDelete = async () => {
    if (!activePackage) return;
    setIsSubmitting(true);
    const res = await setRateCardPackageStatus(
      { id: activePackage.id, rateCardId: activePackage.rateCardId, base: activePackage },
      "draft"
    );
    setIsSubmitting(false);
    if (res.success && res.data) {
      setPackages((prev) => prev.map((p) => (p.id === activePackage.id ? res.data! : p)));
      setIsDeleteOpen(false); setActivePackage(null);
      showToast("Paket dijadikan draf dan tidak lagi tampil di toko.");
    } else {
      setDeleteError(res.error ?? "Gagal menjadikan draf.");
    }
  };

  // Capped at 3 packages max, with empty placeholder fillers
  const visiblePackages = packages.slice(0, MAX_PACKAGES);
  const emptySlotsCount = Math.max(0, MAX_PACKAGES - visiblePackages.length);

  // Shared input class with Creator focus ring & styling
  const inputCls = "w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-slate-50 border border-slate-200/90 rounded-xl sm:rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all";

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">

        <div>

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
            <CreatorPageHeader
              title="Paket Harga Jasa"
              description="Kelola paket jasa kreator untuk pesanan harga tetap."
            />
            <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0 w-full sm:w-auto">
              <button
                onClick={openCreate}
                disabled={isAtLimit}
                aria-disabled={isAtLimit}
                className={cn(
                  "w-full sm:w-auto px-5 py-3 rounded-xl sm:rounded-2xl text-xs font-black transition-all shadow-md min-h-[46px] flex items-center justify-center gap-2",
                  isAtLimit
                    ? "bg-slate-200 text-slate-400 border border-slate-300/40 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:shadow-[0_8px_24px_rgba(124,58,237,0.35)] text-white hover:-translate-y-0.5 cursor-pointer"
                )}
              >
                <Plus size={16} />
                <span>Buat Paket Baru</span>
              </button>
              {isAtLimit && (
                <p className="text-[10px] text-amber-600 font-bold sm:text-right leading-snug">
                  Maksimal 3 paket telah tercapai.
                </p>
              )}
            </div>
          </div>

          {/* ── Metric summary ── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 mb-8">
            <MetricInfoCard
              icon={ClipboardList}
              label="Paket Aktif"
              value={activeCount.toString()}
              note="Tampil di direktori kreator"
              colors={{
                bg: "#f0f6ff",
                iconColor: "#2563eb",
                border: "rgba(37,99,235,.18)",
              }}
            />
            <MetricInfoCard
              icon={BadgeDollarSign}
              label="Harga Mulai Dari"
              value={startingPrice > 0 ? formatCurrency(startingPrice) : "—"}
              note="Harga paket termurah aktif"
              colors={{
                bg: "#f5f3ff",
                iconColor: "#7c3aed",
                border: "rgba(124,58,237,.18)",
              }}
            />
            <MetricInfoCard
              icon={ShoppingBag}
              label="Pesanan Jasa Masuk"
              value={ordersCount.toString()}
              note="Melalui Paket Harga"
              colors={{
                bg: "#f0fdf4",
                iconColor: "#16a34a",
                border: "rgba(22,163,74,.18)",
              }}
            />
          </div>

          {/* ── Package catalog (Max 3, fills remaining with distinct empty state cards) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
            {visiblePackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onToggle={handleToggleActive}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
                busy={togglingId === pkg.id}
              />
            ))}
            {Array.from({ length: emptySlotsCount }).map((_, idx) => (
              <EmptyPlaceholderRateCard
                key={`empty-rate-card-${idx}`}
                variantIndex={visiblePackages.length + idx}
                onCreateClick={openCreate}
              />
            ))}
          </div>

        </div>

      {/* ════════════════ Modal: Create ════════════════ */}
      {isCreateOpen && (
        <ModalFrame
          isOpen={isCreateOpen}
          title="Buat Paket Baru"
          description="Lengkapi spesifikasi jasa Paket Harga untuk penawaran UMKM"
          onClose={() => setIsCreateOpen(false)}
        >
            {formError && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-rose-800 text-xs font-bold mb-4">
                <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Nama Paket</label>
                <input type="text" required placeholder="Contoh: Ulasan TikTok Standar" value={formName} onChange={(e) => setFormName(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Harga (Rp)</label>
                  <input type="number" required min={0} value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Estimasi (Hari)</label>
                  <input type="number" required min={1} value={formDuration} onChange={(e) => setFormDuration(Number(e.target.value))} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Batas Revisi</label>
                <input type="number" required min={0} value={formRevisions} onChange={(e) => setFormRevisions(Number(e.target.value))} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Output / Hasil Kerja</label>
                <input type="text" required placeholder="Contoh: 1 Video TikTok (30-60 detik) + Tautan Bio 3 Hari" value={formDeliverables} onChange={(e) => setFormDeliverables(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Deskripsi Paket</label>
                <textarea rows={3} required placeholder="Jelaskan konsep konten, gaya visual, dan apa yang didapat UMKM..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className={cn(inputCls, "resize-none")} />
              </div>
              <div className="flex items-center gap-3 p-3.5 bg-violet-50/50 hover:bg-violet-50/80 rounded-2xl border border-violet-200/60 transition-colors">
                <input type="checkbox" id="create-active" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} className="rounded-md border-slate-300 text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer" />
                <label htmlFor="create-active" className="font-extrabold text-slate-800 text-xs cursor-pointer select-none">Aktifkan dan tampilkan di katalog publik</label>
              </div>
              <div className="pt-3 flex gap-3">
                <button type="button" disabled={isSubmitting} onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60">{isSubmitting ? "Menyimpan…" : "Buat Paket"}</button>
              </div>
            </form>
        </ModalFrame>
      )}

      {/* ════════════════ Modal: Edit ════════════════ */}
      {isEditOpen && activePackage && (
        <ModalFrame
          isOpen={isEditOpen}
          title="Ubah Paket Jasa"
          description={activePackage.name}
          onClose={() => { setIsEditOpen(false); setActivePackage(null); }}
        >
            {formError && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-rose-800 text-xs font-bold mb-4">
                <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Nama Paket</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Harga (Rp)</label>
                  <input type="number" required min={0} value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Estimasi (Hari)</label>
                  <input type="number" required min={1} value={formDuration} onChange={(e) => setFormDuration(Number(e.target.value))} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Batas Revisi</label>
                <input type="number" required min={0} value={formRevisions} onChange={(e) => setFormRevisions(Number(e.target.value))} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Output / Hasil Kerja</label>
                <input type="text" required value={formDeliverables} onChange={(e) => setFormDeliverables(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Deskripsi Paket</label>
                <textarea rows={3} required value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className={cn(inputCls, "resize-none")} />
              </div>
              <div className="flex items-center gap-3 p-3.5 bg-violet-50/50 hover:bg-violet-50/80 rounded-2xl border border-violet-200/60 transition-colors">
                <input type="checkbox" id="edit-active" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} className="rounded-md border-slate-300 text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer" />
                <label htmlFor="edit-active" className="font-extrabold text-slate-800 text-xs cursor-pointer select-none">Aktifkan dan tampilkan di katalog publik</label>
              </div>
              <div className="pt-3 flex gap-3">
                <button type="button" disabled={isSubmitting} onClick={() => { setIsEditOpen(false); setActivePackage(null); }} className="flex-1 py-3 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60">{isSubmitting ? "Menyimpan…" : "Simpan Perubahan"}</button>
              </div>
            </form>
        </ModalFrame>
      )}

      {/* ════════════════ Modal: Delete confirm ════════════════ */}
      {isDeleteOpen && activePackage && (
        <ModalFrame
          isOpen={isDeleteOpen}
          title="Hapus Paket Jasa?"
          description="Tindakan ini tidak dapat dibatalkan."
          onClose={() => { setIsDeleteOpen(false); setActivePackage(null); }}
          className="max-w-sm"
        >
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-500 mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed text-center mb-4">
              Apakah Anda yakin ingin menghapus{" "}
              <span className="font-extrabold text-slate-900">&quot;{activePackage.name}&quot;</span>{" "}
              secara permanen?
            </p>

            {deleteError && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-800 text-[11px] font-semibold leading-relaxed mb-4">
                {deleteError}
              </div>
            )}

            {deleteBlocked ? (
              <div className="flex flex-col gap-2.5">
                <button type="button" disabled={isSubmitting} onClick={handleMakeDraftFromDelete} className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60">
                  {isSubmitting ? "Memproses…" : "Jadikan Draf Saja"}
                </button>
                <button type="button" onClick={() => { setIsDeleteOpen(false); setActivePackage(null); }} className="w-full py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer">Tutup</button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button type="button" disabled={isSubmitting} onClick={() => { setIsDeleteOpen(false); setActivePackage(null); }} className="flex-1 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50">Batal</button>
                <button type="button" disabled={isSubmitting} onClick={executeDelete} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60">{isSubmitting ? "Menghapus…" : "Ya, Hapus Paket"}</button>
              </div>
            )}
        </ModalFrame>
      )}

    </div>
  );
}
