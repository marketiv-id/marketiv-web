"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  User,
  ImageIcon,
  Camera,
  Bell,
  ShieldCheck,
  MapPin,
  Star,
  Zap,
  CheckCircle2,
  Briefcase,
  Eye,
  Globe,
  Mail,
  Lock,
  ChevronRight,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { CreatorProfile, CreatorPortfolioItem, CreatorNiche } from "@/types/creator-dashboard";
import { CreatorPageHeader } from "./CreatorPageHeader";
import { CreatorEmptyState } from "./CreatorEmptyState";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { cn } from "@/lib/utils";
import {
  creatorProfileUpdateSchema,
  creatorPortfolioSchema,
  extractSocialUsername,
} from "@/lib/validations/profile.schema";
import { parseOrErrors } from "@/lib/validations/to-field-errors";
import { getSession } from "@/services/auth/session.service";
import {
  getCreatorProfile,
  updateCreatorProfile,
  uploadCreatorAvatar,
  uploadCreatorBanner,
  upsertCreatorSocialAccount,
  createCreatorPortfolio,
  updateCreatorPortfolio,
  deleteCreatorPortfolio,
  uploadCreatorPortfolioThumbnail,
} from "@/services/creator/creator-dashboard.service";

// ─── Creator brand gradient ───────────────────────────────────────────────────
const CREATOR_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-gradient-start), var(--color-kreator-gradient-end))";
const CREATOR_GRADIENT_SOFT =
  "linear-gradient(135deg, color-mix(in srgb, var(--color-kreator-gradient-start) 12%, transparent) 0%, color-mix(in srgb, var(--color-kreator-gradient-end) 10%, transparent) 100%)";
const CREATOR_GRADIENT_SHADOW =
  "0 6px 20px color-mix(in srgb, var(--color-kreator-gradient-start) 22%, transparent)";

// ─── Tab definition ───────────────────────────────────────────────────────────

const TABS = [
  { id: "profil", label: "Profil Kreator", icon: User, description: "Identitas publik & bio" },
  { id: "portofolio", label: "Portofolio", icon: ImageIcon, description: "Katalog konten video" },
  { id: "notifikasi", label: "Notifikasi", icon: Bell, description: "Preferensi pemberitahuan" },
  { id: "keamanan", label: "Keamanan", icon: ShieldCheck, description: "Password & akses" },
] as const;

type SettingsTab = typeof TABS[number]["id"];

// ─── Shared card wrapper ──────────────────────────────────────────────────────

function SettingsCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-[26px] border border-neutral-200/60",
        "shadow-[0_8px_24px_rgba(15,23,42,.06)]",
        "w-full overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

function ModalFrame({
  children,
  maxW = "max-w-md",
  isOpen,
  onClose,
  title,
}: {
  children: React.ReactNode;
  maxW?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className={cn("max-h-[90vh] overflow-y-auto", maxW)}>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="sr-only">{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription className="sr-only">{title}</ResponsiveModalDescription>
        </ResponsiveModalHeader>
        {children}
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

// ─── Section header inside a card ─────────────────────────────────────────────

function CardSectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-neutral-100">
      <h3 className="text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-[0.14em]">
        {title}
      </h3>
      {action}
    </div>
  );
}

// ─── Stat row ────────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-neutral-100/60 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-[10px] bg-neutral-50 border border-neutral-200/60 flex items-center justify-center shrink-0 text-neutral-400">
          {icon}
        </div>
        <span className="text-[0.84rem] font-[600] text-neutral-500 truncate">{label}</span>
      </div>
      <span className="text-[0.86rem] font-[800] text-neutral-900 shrink-0">{value}</span>
    </div>
  );
}

// ─── Toggle switch (creator blue/violet) ──────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative shrink-0 w-12 h-[28px] rounded-full transition-all duration-250 focus-visible:outline-[4px] focus-visible:outline focus-visible:outline-blue-500/20 focus-visible:outline-offset-2",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
      style={{
        background: checked ? CREATOR_GRADIENT : "var(--color-control-off)",
        boxShadow: checked
          ? "0 4px 14px color-mix(in srgb, var(--color-kreator-gradient-start) 30%, transparent)"
          : "inset 0 1px 3px rgb(0 0 0 / 0.08)",
      }}
    >
      <span
        className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-md transition-all duration-250"
        style={{ left: checked ? "calc(100% - 25px)" : "3px" }}
      />
    </button>
  );
}

// ─── Notification toggle row ──────────────────────────────────────────────────

function NotifToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-neutral-100/70 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[0.9rem] font-[700] text-neutral-800 leading-tight">{label}</p>
        <p className="text-[0.76rem] font-[500] text-neutral-400 mt-0.5 leading-snug pr-4">
          {description}
        </p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─── Primary button (creator brand) ──────────────────────────────────────────

function CreatorBtn({
  children,
  onClick,
  type = "button",
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-2 px-6 py-2.5 rounded-full",
        "text-white font-[700] text-[0.84rem]",
        "transition-all duration-200 active:translate-y-0",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:-translate-y-0.5",
        "focus-visible:outline-[4px] focus-visible:outline focus-visible:outline-blue-500/20 focus-visible:outline-offset-2",
        className
      )}
      style={{ background: CREATOR_GRADIENT, boxShadow: CREATOR_GRADIENT_SHADOW }}
    >
      {children}
    </button>
  );
}

// ─── Ghost button ─────────────────────────────────────────────────────────────

function GhostBtn({
  children,
  onClick,
  type = "button",
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-2 px-6 py-2.5 rounded-full",
        "border border-neutral-200 text-neutral-600 hover:bg-neutral-50",
        "font-[700] text-[0.84rem] transition-all duration-200",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════════

import { useCreatorIdentity } from "./CreatorIdentityContext";
import { useAuth } from "@/components/providers/AuthProvider";

interface SettingsViewProps {
  initialProfile: CreatorProfile;
  initialPortfolio: CreatorPortfolioItem[];
}

export function SettingsView({ initialProfile, initialPortfolio }: SettingsViewProps) {
  const { refreshIdentity } = useCreatorIdentity();
  const { refresh: refreshAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profil");

  // ── Profile state ──
  // Tanpa fallback fabrikasi: bannerUrl/averageViews/responseTime/completionRate/
  // portfolioUrl tidak punya kolom sumber, jadi biarkan kosong dan render "—".
  const [profile, setProfile] = useState<CreatorProfile>(initialProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [tiktokUrl, setTiktokUrl] = useState(profile.tiktokUrl || "");
  const [selectedNiche, setSelectedNiche] = useState<CreatorNiche>(profile.niche);
  const [formError, setFormError] = useState<string | null>(null);
  const [isProfileSuccessOpen, setIsProfileSuccessOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");

  // ── Portfolio state ──
  const [portfolioItems, setPortfolioItems] = useState<CreatorPortfolioItem[]>(initialPortfolio);
  const [isAddPortOpen, setIsAddPortOpen] = useState(false);
  const [isEditPortOpen, setIsEditPortOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activePortItem, setActivePortItem] = useState<CreatorPortfolioItem | null>(null);
  const [portTitle, setPortTitle] = useState("");
  const [portUrl, setPortUrl] = useState("");
  const [portDesc, setPortDesc] = useState("");
  const [portThumbnailUrl, setPortThumbnailUrl] = useState("");
  const [portError, setPortError] = useState<string | null>(null);
  const [isSavingPort, setIsSavingPort] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);

  // ── Notification toggles ──
  const [notifCampaign, setNotifCampaign] = useState(false);
  const [notifDeadline, setNotifDeadline] = useState(false);
  const [notifOrder, setNotifOrder] = useState(false);
  const [notifPayment, setNotifPayment] = useState(false);
  const [notifMessage, setNotifMessage] = useState(false);
  const [notifNewsletter, setNotifNewsletter] = useState(false);

  const showToast = (msg: string) => toast.success(msg);

  // Email dikelola collection `users` (read-only dari klien) — ambil dari sesi.
  useEffect(() => {
    let active = true;
    void (async () => {
      const res = await getSession();
      if (active && res.success && res.data) setAccountEmail(res.data.email);
    })();
    return () => {
      active = false;
    };
  }, []);

  // ── Profile handlers ──
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseOrErrors(creatorProfileUpdateSchema, {
      displayName: displayName.trim(),
      bio: bio.trim(),
      city: location.trim(),
      niche: selectedNiche,
    });
    if (!parsed.ok) {
      setFormError(Object.values(parsed.errors)[0] ?? "Periksa kembali isian profil.");
      return;
    }
    // TikTok wajib untuk completion evaluator (server baca creator_social_accounts).
    const tiktokUsername = extractSocialUsername(tiktokUrl);
    if (!tiktokUsername) {
      setFormError("Tautan/username TikTok wajib diisi untuk melengkapi profil.");
      return;
    }

    setFormError(null);
    setIsSavingProfile(true);

    // Social dulu — Function update-profile evaluasi completion dengan
    // membaca creator_social_accounts; urutan terbalik = flag tidak naik.
    const socialRes = await upsertCreatorSocialAccount({
      platform: "tiktok",
      username: tiktokUsername,
    });
    if (!socialRes.success) {
      setIsSavingProfile(false);
      setFormError(socialRes.error ?? "Gagal menyimpan akun TikTok.");
      return;
    }

    const res = await updateCreatorProfile(parsed.data);

    if (!res.success || !res.data) {
      setIsSavingProfile(false);
      setFormError(
        res.code === "auth"
          ? "Sesi berakhir, silakan login kembali."
          : res.error ?? "Gagal menyimpan profil."
      );
      return;
    }

    setIsSavingProfile(false);
    setProfile(res.data);
    setIsEditing(false);
    setIsProfileSuccessOpen(true);
    // Baca ulang isProfileCompleted dari koleksi profil ke AuthProvider.
    await refreshAuth({ background: true, preserveUserOnError: true });
    await refreshIdentity();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploadingAvatar(true);
    const uploaded = await uploadCreatorAvatar(file);
    if (!uploaded.success || !uploaded.data) {
      setIsUploadingAvatar(false);
      toast.error(uploaded.error ?? "Gagal mengunggah foto profil.");
      return;
    }
    const saved = await updateCreatorProfile({ avatarUrl: uploaded.data });
    setIsUploadingAvatar(false);
    if (saved.success && saved.data) {
      setProfile(saved.data);
      showToast("Foto profil berhasil diperbarui.");
      await refreshIdentity();
    } else {
      toast.error(saved.error ?? "Foto terunggah tapi gagal disimpan.");
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploadingBanner(true);
    const uploaded = await uploadCreatorBanner(file);
    if (!uploaded.success || !uploaded.data) {
      setIsUploadingBanner(false);
      toast.error(uploaded.error ?? "Gagal mengunggah banner profil.");
      return;
    }
    const saved = await updateCreatorProfile({ bannerUrl: uploaded.data });
    setIsUploadingBanner(false);
    if (saved.success && saved.data) {
      setProfile(saved.data);
      showToast("Banner profil berhasil diperbarui.");
      await refreshIdentity();
    } else {
      toast.error(saved.error ?? "Banner terunggah tapi gagal disimpan.");
    }
  };

  // ── Portfolio handlers ──
  // Kolom `creator_portfolios` hanya: creatorId, title, description,
  // thumbnailUrl, portfolioUrl. platform/niche/views tidak ada kolomnya dan
  // sudah dihapus dari form (diminta lagi di handoff Sprint 3).

  const resetPortForm = () => {
    setPortTitle("");
    setPortUrl("");
    setPortDesc("");
    setPortThumbnailUrl("");
    setPortError(null);
  };

  const buildPortInput = () => ({
    title: portTitle.trim(),
    portfolioUrl: portUrl.trim(),
    description: portDesc.trim(),
    thumbnailUrl: portThumbnailUrl || undefined,
  });

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploadingThumb(true);
    const res = await uploadCreatorPortfolioThumbnail(file);
    setIsUploadingThumb(false);
    if (res.success && res.data) {
      setPortThumbnailUrl(res.data);
    } else {
      setPortError(res.error ?? "Gagal mengunggah thumbnail.");
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseOrErrors(creatorPortfolioSchema, buildPortInput());
    if (!parsed.ok) {
      setPortError(Object.values(parsed.errors)[0] ?? "Periksa kembali isian portofolio.");
      return;
    }
    setPortError(null);
    setIsSavingPort(true);
    const res = await createCreatorPortfolio(parsed.data);
    setIsSavingPort(false);
    if (res.success && res.data) {
      setPortfolioItems((prev) => [...prev, res.data!]);
      setIsAddPortOpen(false);
      resetPortForm();
      showToast("Portofolio baru berhasil ditambahkan!");
    } else {
      setPortError(res.error ?? "Gagal menambahkan portofolio.");
    }
  };

  const openEditPortModal = (item: CreatorPortfolioItem) => {
    setActivePortItem(item);
    setPortTitle(item.title);
    setPortUrl(item.url);
    setPortDesc(item.description);
    setPortThumbnailUrl(item.thumbnailUrl ?? "");
    setPortError(null);
    setIsEditPortOpen(true);
  };

  const handleEditPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePortItem) return;
    const parsed = parseOrErrors(creatorPortfolioSchema, buildPortInput());
    if (!parsed.ok) {
      setPortError(Object.values(parsed.errors)[0] ?? "Periksa kembali isian portofolio.");
      return;
    }
    setPortError(null);
    setIsSavingPort(true);
    const res = await updateCreatorPortfolio(activePortItem.id, parsed.data);
    setIsSavingPort(false);
    if (res.success && res.data) {
      setPortfolioItems((prev) =>
        prev.map((item) => (item.id === activePortItem.id ? res.data! : item))
      );
      setIsEditPortOpen(false);
      setActivePortItem(null);
      resetPortForm();
      showToast("Portofolio berhasil diperbarui!");
    } else {
      setPortError(res.error ?? "Gagal memperbarui portofolio.");
    }
  };

  const openDeleteConfirm = (item: CreatorPortfolioItem) => {
    setActivePortItem(item);
    setPortError(null);
    setIsDeleteConfirmOpen(true);
  };

  const executeDeletePortfolio = async () => {
    if (!activePortItem) return;
    setIsSavingPort(true);
    const res = await deleteCreatorPortfolio(activePortItem.id);
    setIsSavingPort(false);
    if (res.success) {
      setPortfolioItems((prev) => prev.filter((item) => item.id !== activePortItem.id));
      setIsDeleteConfirmOpen(false);
      setActivePortItem(null);
      showToast("Item portofolio berhasil dihapus.");
    } else {
      // Baris pra-Sprint 3 tak punya row-perm delete — sampaikan apa adanya.
      setPortError(res.error ?? "Gagal menghapus item portofolio.");
    }
  };

  // ── Input class ──
  const inputCls =
    "w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-[14px] " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 " +
    "transition-all font-[600] text-neutral-800 text-[0.88rem] placeholder:text-neutral-300";

  // ══════════════════════════════════════════════════════════════════════════════
  // Panel: Profil Kreator
  // ══════════════════════════════════════════════════════════════════════════════

  const renderProfil = () => (
    <div className="flex flex-col gap-5 w-full">

      {/* ── Identity showcase card ── */}
      <SettingsCard>
        {/* Banner — real persisted profile cover image with responsive fixed container & object-cover */}
        <div className="relative w-full h-[180px] sm:h-[220px] lg:h-[260px] overflow-hidden group/banner">
          {profile.bannerUrl ? (
            <Image
              src={profile.bannerUrl}
              alt={`Banner ${profile.name}`}
              fill
              className="object-cover object-center"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
              priority
            />
          ) : (
            <div className="absolute inset-0" style={{ background: CREATOR_GRADIENT }} />
          )}
          {/* Gradient fade at bottom for avatar overlap */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/30 to-transparent pointer-events-none z-[5]" />

          {/* Banner upload overlay */}
          <label
            className={cn(
              "absolute inset-0 bg-neutral-950/45 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white cursor-pointer z-10",
              isUploadingBanner
                ? "opacity-100 cursor-wait"
                : "opacity-0 group-hover/banner:opacity-100"
            )}
          >
            <Camera className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {isUploadingBanner ? "Mengunggah…" : "Ganti Banner"}
            </span>
            <span className="text-[0.68rem] text-white/80 font-normal">
              Gunakan gambar landscape. Rekomendasi 1600 × 500 px.
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={isUploadingBanner}
              onChange={handleBannerChange}
            />
          </label>
        </div>

        {/* Avatar row — overlaps banner only, never the name */}
        <div className="px-6 -mt-14 relative flex items-end justify-between gap-3">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[22px] border-4 border-white shadow-lg overflow-hidden bg-neutral-100 shrink-0 group/avatar">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white text-2xl sm:text-3xl font-black">
                {profile.name?.trim().charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <label
              className={cn(
                "absolute inset-0 bg-neutral-950/55 transition-opacity flex items-center justify-center text-[0.65rem] font-[900] text-white uppercase tracking-wider",
                isUploadingAvatar
                  ? "opacity-100 cursor-wait"
                  : "opacity-0 group-hover/avatar:opacity-100 cursor-pointer"
              )}
            >
              {isUploadingAvatar ? "Mengunggah…" : "Ganti"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isUploadingAvatar}
                onChange={handleAvatarChange}
              />
            </label>
            {/* Online indicator */}
            <span className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          {/* Edit button — right-aligned, below the banner */}
          {!isEditing && (
            <button
              onClick={() => {
                setDisplayName(profile.name);
                setBio(profile.bio);
                setLocation(profile.location);
                setTiktokUrl(profile.tiktokUrl || "");
                setSelectedNiche(profile.niche);
                setIsEditing(true);
              }}
              className="mb-1 shrink-0 flex items-center gap-1.5 px-4 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-[13px] text-[0.8rem] font-[700] text-neutral-600 transition-all cursor-pointer"
            >
              <Pencil size={13} /> Ubah Profil
            </button>
          )}
        </div>

        {/* Identity — always below banner, never overlaps */}
        <div className="px-6 pb-6 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[1.15rem] font-[900] text-neutral-900 tracking-tight leading-none">
              {profile.name}
            </h3>
            {profile.isVerified && (
              <BadgeCheck size={17} className="text-blue-500 shrink-0" />
            )}
          </div>
          <p className="text-[0.78rem] font-[600] text-neutral-400 mt-1">
            @{profile.username}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[0.66rem] font-[900] uppercase tracking-wider text-white"
              style={{ background: CREATOR_GRADIENT }}
            >
              {profile.niche}
            </span>
            <span className="flex items-center gap-1 text-[0.72rem] font-[600] text-neutral-400">
              <MapPin size={11} className="text-neutral-300" />
              {profile.location}
            </span>
          </div>

          {/* Bio & social links (view mode) */}
          {!isEditing && (
            <div className="mt-4 space-y-3">
              <p className="text-[0.9rem] font-[500] text-neutral-600 leading-relaxed">
                {profile.bio}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {profile.tiktokUrl && (
                  <a
                    href={profile.tiktokUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 text-white text-[0.75rem] font-[700] hover:bg-neutral-800 transition-colors"
                  >
                    TikTok <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* ── Edit form (only visible while editing) ── */}
      {isEditing && (
        <SettingsCard>
          <CardSectionHeader title="Ubah Informasi Profil" />
          <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 p-3.5 rounded-[14px] text-red-800 text-[0.82rem] font-[700]">
                ⚠️ {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-wider">
                  Nama Display
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-wider">
                  Kota Lokasi
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-wider">
                Kategori Niche Utama
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Harus lengkap sesuai enum creator_profiles.niche — `edukasi`
                    sebelumnya hilang dari daftar ini. */}
                {(
                  [
                    "kecantikan",
                    "kuliner",
                    "fashion",
                    "pariwisata",
                    "edukasi",
                    "lainnya",
                  ] as CreatorNiche[]
                ).map(
                  (n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSelectedNiche(n)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-[12px] border text-[0.8rem] font-[700] capitalize transition-all cursor-pointer",
                        selectedNiche === n
                          ? "text-white border-transparent shadow-sm"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                      )}
                      style={
                        selectedNiche === n
                          ? { background: CREATOR_GRADIENT }
                          : {}
                      }
                    >
                      {n}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-wider">
                Bio Singkat
              </label>
              <textarea
                rows={3}
                required
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className={cn(inputCls, "resize-none")}
              />
            </div>

            {/* Akun sosial disimpan di collection `creator_social_accounts`
                (bukan kolom URL di profil) — handle diekstrak dari tautan. */}
            <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 pt-4">
              <div className="space-y-1.5">
                <label className="block text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-wider">
                  Link / Username TikTok
                </label>
                <input
                  type="text"
                  placeholder="https://tiktok.com/@handle"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <GhostBtn
                type="button"
                disabled={isSavingProfile}
                onClick={() => {
                  setIsEditing(false);
                  setFormError(null);
                }}
                className="flex-1"
              >
                Batal
              </GhostBtn>
              <CreatorBtn type="submit" disabled={isSavingProfile} className="flex-1">
                {isSavingProfile ? "Menyimpan…" : "Simpan Profil"}
              </CreatorBtn>
            </div>
          </form>
        </SettingsCard>
      )}

      {/* ── Statistik & Reputasi ── */}
      <SettingsCard>
        <CardSectionHeader title="Statistik & Reputasi" />
        <div className="px-6 py-1">
          <StatRow
            label="Total Kontrak Selesai"
            value={`${profile.completedJobs} Kontrak`}
            icon={<Briefcase size={13} />}
          />
          {/* averageViews/responseTime/completionRate belum punya kolom sumber —
              render "—", jangan mengarang angka performa milik kreator sendiri. */}
          <StatRow
            label="Rata-rata Views per Konten"
            value={
              profile.averageViews !== undefined
                ? `${profile.averageViews.toLocaleString("id-ID")} views`
                : "—"
            }
            icon={<Eye size={13} />}
          />
          <StatRow
            label="Rating dari Klien"
            value={`⭐ ${profile.rating} / 5.0`}
            icon={<Star size={13} />}
          />
          <StatRow
            label="Estimasi Waktu Respon"
            value={profile.responseTime ? `⚡ ~${profile.responseTime}` : "—"}
            icon={<Zap size={13} />}
          />
          <StatRow
            label="Tingkat Penyelesaian Job"
            value={profile.completionRate !== undefined ? `${profile.completionRate}%` : "—"}
            icon={<CheckCircle2 size={13} />}
          />
          <StatRow
            label="Total Followers Gabungan"
            value={`${profile.followers.toLocaleString("id-ID")} followers`}
            icon={<Globe size={13} />}
          />
        </div>
        <div className="px-6 py-4 bg-neutral-50/60 border-t border-neutral-100">
          <p className="text-[0.72rem] font-[600] text-neutral-400 leading-relaxed">
            Statistik dihitung otomatis dari aktivitas di Marketiv dan diperbarui setiap hari.
          </p>
        </div>
      </SettingsCard>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Panel: Portofolio
  // ══════════════════════════════════════════════════════════════════════════════

  const renderPortofolio = () => (
    <div className="flex flex-col gap-5 w-full">
      <SettingsCard>
        <CardSectionHeader
          title="Katalog Portofolio Konten"
          action={
            <button
              onClick={() => {
                resetPortForm();
                setIsAddPortOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[0.78rem] font-[800] text-white transition-all cursor-pointer hover:-translate-y-0.5"
              style={{
                background: CREATOR_GRADIENT,
                boxShadow: "0 4px 12px color-mix(in srgb, var(--color-kreator-gradient-start) 22%, transparent)",
              }}
            >
              <Plus size={13} /> Tambah
            </button>
          }
        />
        <div className="p-6">
          {portfolioItems.length === 0 ? (
            <CreatorEmptyState
              title="Belum Ada Portofolio"
              description="Tambahkan konten video terbaik kamu biar brand bisa lihat karya kamu."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-neutral-50/60 border border-neutral-200/60 rounded-[20px] overflow-hidden flex flex-col group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  {item.thumbnailUrl && (
                    <div className="relative w-full h-36 bg-neutral-200">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      {item.platform && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-neutral-900/80 text-white text-[0.62rem] font-[900] uppercase tracking-wider">
                          {item.platform}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-1 gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-[800] text-neutral-900 text-[0.88rem] leading-snug line-clamp-1 flex-1">
                        {item.title}
                      </h5>
                      {item.niche && (
                        <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-white text-[0.62rem] font-[900] uppercase tracking-wider" style={{ background: CREATOR_GRADIENT }}>
                          {item.niche}
                        </span>
                      )}
                    </div>
                    <p className="text-[0.78rem] text-neutral-400 font-[500] leading-relaxed line-clamp-2 flex-1">
                      {item.description}
                    </p>
                    {item.views !== undefined && (
                      <div className="flex items-center justify-between text-[0.72rem] font-[800] text-neutral-400 pt-2 border-t border-neutral-200/40 mt-auto">
                        <span>VIEWS PENONTON</span>
                        <span className="text-neutral-800">{item.views.toLocaleString("id-ID")} views</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-neutral-200/40 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEditPortModal(item)}
                      className="flex items-center justify-center gap-1 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-[10px] text-[0.75rem] font-[700] text-neutral-700 transition-all cursor-pointer"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(item)}
                      className="flex items-center justify-center gap-1 py-2 bg-red-50 hover:bg-red-100 border border-red-200/50 text-red-600 rounded-[10px] text-[0.75rem] font-[700] transition-all cursor-pointer"
                    >
                      <Trash2 size={11} /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Panel: Notifikasi
  // ══════════════════════════════════════════════════════════════════════════════

  const renderNotifikasi = () => (
    <div className="flex flex-col gap-5 w-full">
      <SettingsCard>
        <CardSectionHeader title="Notifikasi Kampanye & Pekerjaan" />
        <p className="px-6 pt-4 text-[0.72rem] font-[700] text-neutral-400">
          Fitur notifikasi akan segera hadir.
        </p>
        <div className="px-6 py-1">
          <NotifToggleRow
            label="Campaign Baru Sesuai Niche"
            description="Terima notifikasi saat ada campaign baru yang cocok dengan kategori konten kamu."
            checked={notifCampaign}
            onChange={setNotifCampaign}
            disabled
          />
          <NotifToggleRow
            label="Pengingat Deadline Pekerjaan"
            description="Ingatkan saya H-2 sebelum tenggat waktu pengiriman konten."
            checked={notifDeadline}
            onChange={setNotifDeadline}
            disabled
          />
          <NotifToggleRow
            label="Update Status Order Rate Card"
            description="Notifikasi saat UMKM melakukan order, konfirmasi, atau revisi pada paket kamu."
            checked={notifOrder}
            onChange={setNotifOrder}
            disabled
          />
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardSectionHeader title="Notifikasi Pembayaran & Pesan" />
        <div className="px-6 py-1">
          <NotifToggleRow
            label="Alert Pembayaran & Pencairan"
            description="Notifikasi instan saat pembayaran masuk ke wallet atau pencairan berhasil diproses."
            checked={notifPayment}
            onChange={setNotifPayment}
            disabled
          />
          <NotifToggleRow
            label="Pesan Baru dari Brand atau Admin"
            description="Notifikasi saat ada pesan baru di negosiasi atau pengumuman dari Marketiv."
            checked={notifMessage}
            onChange={setNotifMessage}
            disabled
          />
          <NotifToggleRow
            label="Newsletter & Tips Kreator"
            description="Email bulanan berisi tips monetisasi, update fitur, dan insight dari Marketiv."
            checked={notifNewsletter}
            onChange={setNotifNewsletter}
            disabled
          />
        </div>
      </SettingsCard>

      <div className="flex justify-end">
        <CreatorBtn disabled onClick={() => {}}>
          Simpan Preferensi
        </CreatorBtn>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Panel: Keamanan
  // ══════════════════════════════════════════════════════════════════════════════

  const renderKeamanan = () => (
    <div className="flex flex-col gap-5 w-full">
      <SettingsCard>
        <CardSectionHeader title="Informasi Akun" />
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-wider">
                Username
              </label>
              <div className="flex items-center gap-2.5 w-full px-4 py-2.5 bg-neutral-50/80 border border-neutral-200/60 rounded-[14px]">
                <span className="text-neutral-300 font-[800] text-[0.9rem]">@</span>
                <span className="text-[0.88rem] font-[600] text-neutral-600">{profile.username}</span>
              </div>
              <p className="text-[0.68rem] font-[600] text-neutral-300">Username tidak dapat diubah</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-wider">
                Email Terdaftar
              </label>
              <div className="flex items-center gap-2.5 w-full px-4 py-2.5 bg-neutral-50/80 border border-neutral-200/60 rounded-[14px]">
                <Mail size={14} className="text-neutral-300 shrink-0" />
                <span className="text-[0.88rem] font-[600] text-neutral-600 truncate">
                  {accountEmail || "—"}
                </span>
              </div>
              <p className="text-[0.68rem] font-[600] text-neutral-300">Dikelola via sistem autentikasi</p>
            </div>
          </div>
          {profile.isVerified ? (
            <div className="flex items-center gap-3 p-3.5 rounded-[14px] bg-blue-50 border border-blue-200/60">
              <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
              <div>
                <p className="text-[0.82rem] font-[700] text-blue-800">Akun Terverifikasi</p>
                <p className="text-[0.72rem] font-[500] text-blue-600 mt-0.5">
                  Identitas kamu telah diverifikasi oleh tim Marketiv
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3.5 rounded-[14px] bg-neutral-50 border border-neutral-200/60">
              <CheckCircle2 size={16} className="text-neutral-300 shrink-0" />
              <div>
                <p className="text-[0.82rem] font-[700] text-neutral-600">Verifikasi Tertunda</p>
                <p className="text-[0.72rem] font-[500] text-neutral-400 mt-0.5">
                  Tim Marketiv sedang memproses verifikasi identitas kamu
                </p>
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardSectionHeader
          title="Ubah Password"
          action={
            <span className="px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[0.66rem] font-[800] text-neutral-400 uppercase tracking-wider">
              Segera tersedia
            </span>
          }
        />
        <div className="p-6 space-y-4 opacity-50 pointer-events-none select-none" aria-hidden="true">
          <div className="space-y-1.5">
            <label className="block text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-wider">
              Password Saat Ini
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
              <input type="password" placeholder="••••••••" disabled className={cn(inputCls, "pl-10")} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-wider">
                Password Baru
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                <input type="password" placeholder="Min. 8 karakter" disabled className={cn(inputCls, "pl-10")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-400 uppercase tracking-wider">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                <input type="password" placeholder="Ulangi password baru" disabled className={cn(inputCls, "pl-10")} />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <CreatorBtn disabled>Ubah Password</CreatorBtn>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <CardSectionHeader
          title="Sesi & Aktivitas Login"
          action={
            <span className="px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[0.66rem] font-[800] text-neutral-400 uppercase tracking-wider">
              Segera tersedia
            </span>
          }
        />
        <div className="p-6">
          <div className="flex items-center gap-3 p-3.5 rounded-[14px] bg-neutral-50 border border-neutral-200/60">
            <ShieldCheck size={16} className="text-neutral-300 shrink-0" />
            <p className="text-[0.82rem] font-[600] text-neutral-400">
              Riwayat sesi akan ditampilkan di sini setelah fitur aktif.
            </p>
          </div>
        </div>
      </SettingsCard>
    </div>
  );

  const PANEL_MAP: Record<SettingsTab, () => React.ReactNode> = {
    profil: renderProfil,
    portofolio: renderPortofolio,
    notifikasi: renderNotifikasi,
    keamanan: renderKeamanan,
  };

  // ── Modal frame ───────────────────────────────────────────────────────────────
  const inputModalCls = inputCls;

  // ══════════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
      <CreatorPageHeader
        title="Pengaturan"
        description="Kelola profil publik, portofolio, notifikasi, dan keamanan akun kamu."
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ══ Tab Navigation ══ */}

        {/* Mobile: 2×2 grid of tab cards */}
        <div className="grid grid-cols-2 gap-3 w-full lg:hidden">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-2.5 p-4 rounded-[20px] border-2 transition-all duration-200 cursor-pointer text-center",
                  "focus-visible:outline-[4px] focus-visible:outline focus-visible:outline-blue-500/20 focus-visible:outline-offset-2",
                  isActive
                    ? "border-blue-500/25 font-[800] shadow-md"
                    : "border-neutral-200/60 bg-white text-neutral-500 hover:bg-neutral-50 font-[600]"
                )}
                style={isActive ? { background: CREATOR_GRADIENT_SOFT } : {}}
              >
                <div
                  className="w-12 h-12 rounded-[16px] flex items-center justify-center transition-all shrink-0"
                  style={
                    isActive
                      ? {
                          background: CREATOR_GRADIENT,
                          boxShadow: "0 6px 18px color-mix(in srgb, var(--color-kreator-gradient-start) 28%, transparent)",
                        }
                      : { background: "var(--color-surface-subtle)" }
                  }
                >
                  <tab.icon
                    size={20}
                    className={isActive ? "text-white" : "text-neutral-400"}
                  />
                </div>
                <span
                  className={cn(
                    "text-[0.82rem] leading-tight",
                    isActive ? "text-blue-700" : "text-neutral-600"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Desktop: vertical sidebar nav */}
        <nav
          className="hidden lg:flex flex-col gap-1 w-[230px] shrink-0 sticky top-6"
          aria-label="Navigasi Pengaturan"
        >
          <div className="bg-white rounded-[22px] border border-neutral-200/60 shadow-[0_8px_24px_rgba(15,23,42,.06)] p-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] transition-all duration-200 cursor-pointer text-left w-full",
                    "focus-visible:outline-[4px] focus-visible:outline focus-visible:outline-blue-500/17 focus-visible:outline-offset-2",
                    isActive
                      ? "font-[800]"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 font-[600]"
                  )}
                  style={isActive ? { background: CREATOR_GRADIENT_SOFT } : {}}
                >
                  <div
                    className="w-8 h-8 rounded-[11px] flex items-center justify-center shrink-0 transition-all"
                    style={
                      isActive
                        ? {
                            background: CREATOR_GRADIENT,
                            boxShadow: "0 4px 12px color-mix(in srgb, var(--color-kreator-gradient-start) 25%, transparent)",
                          }
                        : { background: "var(--color-surface-subtle)" }
                    }
                  >
                    <tab.icon
                      size={15}
                      className={isActive ? "text-white" : "text-neutral-400"}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[0.88rem] leading-tight truncate",
                        isActive ? "text-blue-700" : ""
                      )}
                    >
                      {tab.label}
                    </span>
                    <span
                      className={cn(
                        "block text-[0.66rem] font-[500] leading-tight mt-0.5 truncate",
                        isActive ? "text-blue-400" : "text-neutral-300"
                      )}
                    >
                      {tab.description}
                    </span>
                  </div>
                  {isActive && (
                    <ChevronRight size={13} className="ml-auto shrink-0 text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ══ Content panel ══ */}
        <div className="flex-1 min-w-0 w-full">
          {PANEL_MAP[activeTab]()}
        </div>
      </div>

      {/* ════════════ Modal: Profile Success ════════════ */}
      {isProfileSuccessOpen && (
        <ModalFrame
          isOpen={isProfileSuccessOpen}
          onClose={() => setIsProfileSuccessOpen(false)}
          title="Profil Berhasil Diperbarui"
        >
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white mx-auto mb-5 shadow-lg"
              style={{ background: CREATOR_GRADIENT }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-[1.05rem] font-[900] text-neutral-900 mb-2 leading-none">
              Profil Berhasil Diperbarui
            </h3>
            <p className="text-[0.82rem] text-neutral-500 font-[500] leading-relaxed max-w-xs mx-auto mb-6">
              Detail profil publik dan tautan sosial media kamu berhasil disinkronisasikan ke
              platform Marketiv.
            </p>
            <CreatorBtn onClick={() => setIsProfileSuccessOpen(false)} className="w-full">
              Selesai & Tutup
            </CreatorBtn>
          </div>
        </ModalFrame>
      )}

      {/* ════════════ Modal: Add Portfolio ════════════ */}
      {isAddPortOpen && (
        <ModalFrame
          isOpen={isAddPortOpen}
          onClose={() => {
            setIsAddPortOpen(false);
            resetPortForm();
          }}
          title="Tambah Portofolio"
        >
          <div className="flex justify-between items-start gap-4 mb-5">
            <div>
              <h3 className="text-[1rem] font-[900] text-neutral-900 leading-none">
                Tambah Portofolio
              </h3>
              <p className="text-[0.7rem] text-neutral-400 font-[700] mt-1 uppercase tracking-wider">
                Lengkapi informasi konten video
              </p>
            </div>
            <button
              onClick={() => setIsAddPortOpen(false)}
              className="p-1.5 rounded-[10px] text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {portError && (
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-[14px] text-red-800 text-[0.82rem] font-[700] mb-4">
              ⚠️ {portError}
            </div>
          )}
          <form onSubmit={handleAddPortfolio} className="space-y-4 text-[0.85rem]">
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-500 uppercase tracking-wider">
                Judul Konten Video
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Makeup Aesthetic Skincare Lokal"
                value={portTitle}
                onChange={(e) => setPortTitle(e.target.value)}
                className={inputModalCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-500 uppercase tracking-wider">
                Tautan URL Postingan
              </label>
              <input
                type="url"
                required
                placeholder="https://tiktok.com/@..."
                value={portUrl}
                onChange={(e) => setPortUrl(e.target.value)}
                className={inputModalCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-500 uppercase tracking-wider">
                Thumbnail (Opsional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploadingThumb}
                onChange={handleThumbnailChange}
                className="block w-full text-[0.78rem] font-[600] text-neutral-600 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-[0.75rem] file:font-[700] file:text-neutral-700 hover:file:bg-neutral-200 disabled:opacity-60"
              />
              {isUploadingThumb && (
                <p className="text-[0.7rem] font-[700] text-neutral-400">Mengunggah thumbnail…</p>
              )}
              {portThumbnailUrl && !isUploadingThumb && (
                <p className="text-[0.7rem] font-[700] text-emerald-600">Thumbnail siap disimpan.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-500 uppercase tracking-wider">
                Deskripsi Singkat Konten
              </label>
              <textarea
                rows={3}
                required
                placeholder="Review toner serum glow up..."
                value={portDesc}
                onChange={(e) => setPortDesc(e.target.value)}
                className={cn(inputModalCls, "resize-none")}
              />
            </div>
            <div className="pt-4 flex gap-3">
              <GhostBtn
                type="button"
                disabled={isSavingPort}
                onClick={() => {
                  setIsAddPortOpen(false);
                  resetPortForm();
                }}
                className="flex-1"
              >
                Batal
              </GhostBtn>
              <CreatorBtn type="submit" disabled={isSavingPort || isUploadingThumb} className="flex-1">
                {isSavingPort ? "Menyimpan…" : "Tambahkan"}
              </CreatorBtn>
            </div>
          </form>
        </ModalFrame>
      )}

      {/* ════════════ Modal: Edit Portfolio ════════════ */}
      {isEditPortOpen && activePortItem && (
        <ModalFrame
          isOpen={isEditPortOpen}
          onClose={() => {
            setIsEditPortOpen(false);
            setActivePortItem(null);
            resetPortForm();
          }}
          title="Ubah Portofolio"
        >
          <div className="flex justify-between items-start gap-4 mb-5">
            <div>
              <h3 className="text-[1rem] font-[900] text-neutral-900 leading-none">
                Ubah Portofolio
              </h3>
              <p className="text-[0.7rem] text-neutral-400 font-[700] mt-1 uppercase tracking-wider line-clamp-1">
                {activePortItem.title}
              </p>
            </div>
            <button
              onClick={() => {
                setIsEditPortOpen(false);
                setActivePortItem(null);
              }}
              className="p-1.5 rounded-[10px] text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {portError && (
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-[14px] text-red-800 text-[0.82rem] font-[700] mb-4">
              ⚠️ {portError}
            </div>
          )}
          <form onSubmit={handleEditPortfolio} className="space-y-4 text-[0.85rem]">
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-500 uppercase tracking-wider">
                Judul Konten Video
              </label>
              <input
                type="text"
                required
                value={portTitle}
                onChange={(e) => setPortTitle(e.target.value)}
                className={inputModalCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-500 uppercase tracking-wider">
                Tautan URL Postingan
              </label>
              <input
                type="url"
                required
                value={portUrl}
                onChange={(e) => setPortUrl(e.target.value)}
                className={inputModalCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-500 uppercase tracking-wider">
                Thumbnail (Opsional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploadingThumb}
                onChange={handleThumbnailChange}
                className="block w-full text-[0.78rem] font-[600] text-neutral-600 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-[0.75rem] file:font-[700] file:text-neutral-700 hover:file:bg-neutral-200 disabled:opacity-60"
              />
              {isUploadingThumb && (
                <p className="text-[0.7rem] font-[700] text-neutral-400">Mengunggah thumbnail…</p>
              )}
              {portThumbnailUrl && !isUploadingThumb && (
                <p className="text-[0.7rem] font-[700] text-emerald-600">Thumbnail siap disimpan.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-[0.68rem] font-[900] text-neutral-500 uppercase tracking-wider">
                Deskripsi Singkat Konten
              </label>
              <textarea
                rows={3}
                required
                value={portDesc}
                onChange={(e) => setPortDesc(e.target.value)}
                className={cn(inputModalCls, "resize-none")}
              />
            </div>
            <div className="pt-4 flex gap-3">
              <GhostBtn
                type="button"
                disabled={isSavingPort}
                onClick={() => {
                  setIsEditPortOpen(false);
                  setActivePortItem(null);
                  resetPortForm();
                }}
                className="flex-1"
              >
                Batal
              </GhostBtn>
              <CreatorBtn type="submit" disabled={isSavingPort || isUploadingThumb} className="flex-1">
                {isSavingPort ? "Menyimpan…" : "Simpan Perubahan"}
              </CreatorBtn>
            </div>
          </form>
        </ModalFrame>
      )}

      {/* ════════════ Modal: Delete Confirm ════════════ */}
      {isDeleteConfirmOpen && activePortItem && (
        <ModalFrame
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setActivePortItem(null);
            setPortError(null);
          }}
          title="Hapus Item Portofolio"
          maxW="max-w-sm"
        >
          <h3 className="text-[1rem] font-[900] text-neutral-900 leading-none mb-3">
            Hapus Item Portofolio?
          </h3>
          <p className="text-[0.82rem] text-neutral-500 font-[500] leading-relaxed mb-6">
            Anda akan menghapus{" "}
            <span className="font-[800] text-neutral-900">
              &quot;{activePortItem.title}&quot;
            </span>{" "}
            secara permanen. Tindakan ini tidak dapat dibatalkan.
          </p>
          {portError && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-[14px] text-amber-800 text-[0.78rem] font-[600] leading-relaxed mb-5">
              {portError}
            </div>
          )}
          <div className="flex gap-3">
            <GhostBtn
              type="button"
              disabled={isSavingPort}
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setActivePortItem(null);
                setPortError(null);
              }}
              className="flex-1"
            >
              {portError ? "Tutup" : "Batal"}
            </GhostBtn>
            {!portError && (
              <button
                type="button"
                disabled={isSavingPort}
                onClick={executeDeletePortfolio}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-[700] text-[0.82rem] rounded-full transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingPort ? "Menghapus…" : "Ya, Hapus"}
              </button>
            )}
          </div>
        </ModalFrame>
      )}
    </div>
  );
}
