"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getUmkmSettingsProfile,
  updateUmkmProfile,
  uploadUmkmLogo,
} from "@/services/umkm/umkm-dashboard.service";
import { getSession } from "@/services/auth/session.service";
import { useAuth } from "@/components/providers/AuthProvider";
import { umkmProfileUpdateSchema } from "@/lib/validations/profile.schema";
import { parseOrErrors } from "@/lib/validations/to-field-errors";
import { NICHE_OPTIONS } from "@/components/features/umkm-dashboard/create-campaign/create-campaign.constants";
import {
  Store,
  MapPin,
  Bell,
  Check,
  Building,
  Phone,
  Mail,
} from "lucide-react";
import { useUmkmIdentity } from "@/components/features/dashboard/UmkmIdentityContext";
import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { UmkmPageWrapper } from "@/components/features/umkm-dashboard/shared/UmkmPageWrapper";
import { HelpAdminModal } from "@/components/features/dashboard/shared/HelpAdminModal";
import { cn } from "@/lib/utils";

// Custom inline SVG icon to avoid dependency package issues
const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.01 1.62 4.18.99 1.17 2.37 1.96 3.86 2.23v3.74c-1.42-.02-2.82-.41-4.04-1.15-.36-.21-.7-.47-1.01-.76v7.37c-.07 1.52-.64 3.01-1.66 4.14-1.02 1.13-2.45 1.83-3.98 1.99-1.53.16-3.11-.21-4.37-1.07A5.996 5.996 0 0 1 3.93 16.2c-.36-1.5-.16-3.11.58-4.47.74-1.36 1.99-2.38 3.48-2.83V12.7c-.52.12-1 .4-1.37.8-.37.4-.59.93-.62 1.48-.03.55.12 1.1.43 1.56.31.46.77.78 1.29.92.52.14 1.07.08 1.55-.16.48-.24.86-.66 1.06-1.17.16-.41.22-.85.22-1.29V0h2.01z" />
  </svg>
);

interface NotificationSetting {
  id: string;
  label: string;
  desc: string;
  enabled: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationSetting[] = [
  { id: "kreator", label: "Aktivitas Kreator", desc: "Pemberitahuan saat kreator mengambil kampanye Anda", enabled: true },
  { id: "submission", label: "Pengiriman Konten", desc: "Pemberitahuan saat bukti tayang video baru dikirim", enabled: true },
  { id: "completed", label: "Penyelesaian Kampanye", desc: "Ringkasan performa saat target penayangan tercapai", enabled: true },
  { id: "escrow", label: "Pembaruan Escrow", desc: "Status keamanan dan konfirmasi pencairan dana reward", enabled: true },
  { id: "negosiasi", label: "Penawaran & Negosiasi", desc: "Notifikasi pesan dan tawaran kustom Rate Card baru", enabled: true },
  { id: "promo", label: "Kabar & Fitur Baru", desc: "Tips promosi bisnis dan pembaruan sistem Marketiv", enabled: false },
];

function Toggle({
  enabled,
  onClick,
  disabled,
}: {
  enabled: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={enabled}
      aria-label="Toggle notifikasi"
      className={cn(
        "w-11 h-6 rounded-full relative transition-all duration-200 shadow-3xs outline-none border-none shrink-0",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-90",
        enabled ? "bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/20" : "bg-neutral-200"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          enabled ? "left-[21px]" : "left-0.5"
        )}
      />
    </button>
  );
}

export function PengaturanClient() {
  const { refreshIdentity } = useUmkmIdentity();
  const { refresh: refreshAuth } = useAuth();

  const [notifications, setNotifications] = useState<NotificationSetting[]>(INITIAL_NOTIFICATIONS);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const handleToggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
    toast.success("Preferensi notifikasi berhasil diperbarui.");
  };

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const logoInputRef = useRef<HTMLInputElement>(null);

  /** Hanya kolom yang benar-benar ada di `umkm_profiles`. */
  const [profile, setProfile] = useState({
    businessName: "",
    category: "",
    description: "",
    city: "",
    address: "",
    tiktok: "",
    logoUrl: "",
    isVerified: false,
  });

  /** Dikelola collection `users` — phone sekarang editable via Function update-profile. */
  const [account, setAccount] = useState({ email: "", phone: "" });

  const handleInputChange = (field: keyof typeof profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handlePhoneChange = (value: string) => {
    setAccount((prev) => ({ ...prev, phone: value }));
    setFieldErrors((prev) => {
      if (!prev.phone) return prev;
      const next = { ...prev };
      delete next.phone;
      return next;
    });
  };

  /** Ambil data; setState hanya di posisi setelah await. */
  const fetchData = useCallback(async (isActive: () => boolean) => {
    const [res, sessionRes] = await Promise.all([getUmkmSettingsProfile(), getSession()]);
    if (!isActive()) return;
    if (res.success && res.data) {
      setProfile({
        businessName: res.data.businessName,
        category: res.data.category,
        description: res.data.description,
        city: res.data.city,
        address: res.data.address,
        tiktok: res.data.tiktok,
        logoUrl: res.data.logoUrl,
        isVerified: res.data.isProfileCompleted,
      });
    } else {
      setLoadError(res.error ?? "Gagal memuat profil.");
    }
    if (sessionRes.success && sessionRes.data) {
      setAccount({ email: sessionRes.data.email, phone: sessionRes.data.phone || "" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await fetchData(() => active);
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  const handleSaveChanges = async () => {
    const parsed = parseOrErrors(umkmProfileUpdateSchema, {
      ...profile,
      phone: account.phone.trim(),
    });
    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      toast.error("Periksa kembali isian yang ditandai.");
      return;
    }
    setFieldErrors({});
    setIsSaving(true);
    const res = await updateUmkmProfile({
      ...parsed.data,
      logoUrl: profile.logoUrl,
      phone: parsed.data.phone,
    });
    setIsSaving(false);
    if (res.success) {
      toast.success("Pengaturan berhasil disimpan!");
      // Baca ulang isProfileCompleted dari koleksi profil ke AuthProvider.
      await refreshAuth({ background: true, preserveUserOnError: true });
      await refreshIdentity();
    } else {
      toast.error(
        res.code === "auth"
          ? "Sesi berakhir, silakan login kembali."
          : res.error ?? "Gagal menyimpan pengaturan."
      );
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploading(true);
    const res = await uploadUmkmLogo(file);
    setIsUploading(false);
    if (res.success && res.data) {
      setProfile((prev) => ({ ...prev, logoUrl: res.data! }));
      toast.success("Logo terunggah. Klik Simpan Perubahan untuk menerapkan.");
    } else {
      toast.error(res.error ?? "Gagal mengunggah logo.");
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-xl text-sm font-semibold text-ink-900 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all shadow-3xs";
  const readOnlyCls =
    "w-full px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-sm font-semibold text-ink-500 outline-none cursor-not-allowed shadow-3xs";
  const errCls = "text-[0.7rem] font-bold text-red-600";

  return (
    <UmkmDashboardChrome businessName={profile.businessName} isVerified={profile.isVerified}>
      <UmkmPageWrapper maxWidth={900} className="gap-6">
        {/* Header Section */}
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2 text-[0.68rem] font-[800] text-orange-600 uppercase tracking-widest">
            <span className="w-4.5 h-[2px] rounded-full bg-orange-500" />
            Akun UMKM
          </div>
          <h1 className="text-[1.8rem] font-[850] text-ink-900 leading-tight tracking-[-0.03em] font-display">
            Pengaturan
          </h1>
        </div>

        {/* Profile Card & Info Fields */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-3xs space-y-8">
          
          {/* Logo & Status Ribbon */}
          <div className="flex items-center gap-5 pb-6 border-b border-neutral-200/60 flex-wrap sm:flex-nowrap">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logoUrl}
                alt="Logo bisnis"
                className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 shadow-sm border border-neutral-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-300 to-orange-500 flex-shrink-0 shadow-sm border border-orange-400/10 flex items-center justify-center text-white text-xl font-bold font-display select-none">
                {profile.businessName?.trim().charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div className="space-y-1.5 min-w-0 flex-1">
              <h3 className="text-[1.1rem] font-bold text-ink-900 truncate leading-none">
                {profile.businessName || "—"}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {profile.isVerified && (
                  <span className="inline-flex items-center gap-1 min-h-[24px] px-2.5 rounded-full bg-emerald-50 border border-emerald-200/50 text-emerald-700 text-[0.7rem] font-extrabold">
                    <Check size={10} strokeWidth={3} /> Akun Terverifikasi
                  </span>
                )}
                <span className="inline-flex items-center min-h-[24px] px-2.5 rounded-full bg-orange-50 border border-orange-200/50 text-orange-600 text-[0.7rem] font-extrabold">
                  UMKM Plan
                </span>
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="hidden"
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={isUploading}
              className="ml-auto px-4 py-2 bg-white hover:bg-neutral-50 text-ink-700 hover:text-ink-900 border border-neutral-200 text-xs font-bold rounded-xl shadow-3xs transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading ? "Mengunggah…" : "Edit Foto"}
            </button>
          </div>

          {loadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              {loadError}
            </div>
          )}

          {/* Section 1: Profil Bisnis (umkm_profiles attributes) */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 border border-orange-200/50 text-orange-600">
                <Store size={16} />
              </div>
              <h4 className="text-[0.92rem] font-extrabold text-ink-900 font-display">
                Profil Bisnis
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nama Bisnis */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.74rem] font-[800] text-ink-600">Nama Bisnis</label>
                <input
                  type="text"
                  value={profile.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
                {fieldErrors.businessName && <span className={errCls}>{fieldErrors.businessName}</span>}
              </div>

              {/* Kategori — select agar nilainya match campaigns.category & idx_category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.74rem] font-[800] text-ink-600">Kategori</label>
                <select
                  value={profile.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  disabled={loading}
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="">Pilih kategori…</option>
                  {NICHE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
                {fieldErrors.category && <span className={errCls}>{fieldErrors.category}</span>}
              </div>

              {/* Deskripsi (Full Width) */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[0.74rem] font-[800] text-ink-600">Deskripsi</label>
                <textarea
                  value={profile.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={3}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-neutral-50/50 border border-neutral-200 rounded-xl text-sm font-semibold text-ink-900 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all shadow-3xs resize-vertical"
                />
                {fieldErrors.description && <span className={errCls}>{fieldErrors.description}</span>}
              </div>
            </div>
          </div>

          {/* Section 2: Kontak & Lokasi (umkm_profiles & users attributes) */}
          <div className="space-y-5 pt-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 border border-blue-200/50 text-blue-600">
                <MapPin size={16} />
              </div>
              <h4 className="text-[0.92rem] font-extrabold text-ink-900 font-display">
                Kontak & Lokasi
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* WhatsApp — kolom `users.phone`, editable via Function update-profile */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.74rem] font-[800] text-ink-600 flex items-center gap-1.5">
                  <Phone size={12} className="text-ink-400" /> Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={account.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  disabled={loading}
                  className={inputCls}
                  placeholder="08xxxxxxxxxx"
                />
                {fieldErrors.phone && <span className={errCls}>{fieldErrors.phone}</span>}
                <span className="text-[0.68rem] font-bold text-ink-400">
                  Wajib untuk melengkapi profil — format 08xx / 628xx.
                </span>
              </div>

              {/* Email — kolom `users.email`, tidak client-writable */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.74rem] font-[800] text-ink-600 flex items-center gap-1.5">
                  <Mail size={12} className="text-ink-400" /> Email Bisnis
                </label>
                <input type="email" value={account.email} readOnly className={readOnlyCls} />
                <span className="text-[0.68rem] font-bold text-ink-400">
                  Dikelola akun — hubungi support untuk mengubah.
                </span>
              </div>

              {/* Kota */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.74rem] font-[800] text-ink-600 flex items-center gap-1.5">
                  <Building size={12} className="text-ink-400" /> Kota
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
                {fieldErrors.city && <span className={errCls}>{fieldErrors.city}</span>}
              </div>

              {/* Alamat */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.74rem] font-[800] text-ink-600 flex items-center gap-1.5">
                  <MapPin size={12} className="text-ink-400" /> Alamat
                </label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
                {fieldErrors.address && <span className={errCls}>{fieldErrors.address}</span>}
              </div>

              {/* TikTok — satu-satunya kanal sosial yang punya kolom di umkm_profiles */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[0.74rem] font-[800] text-ink-600 flex items-center gap-1.5">
                  <TikTokIcon className="w-3.5 h-3.5 text-ink-400" /> TikTok Username
                </label>
                <input
                  type="text"
                  value={profile.tiktok}
                  onChange={(e) => handleInputChange("tiktok", e.target.value)}
                  disabled={loading}
                  className={inputCls}
                />
                {fieldErrors.tiktok && <span className={errCls}>{fieldErrors.tiktok}</span>}
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              onClick={handleSaveChanges}
              disabled={isSaving || loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/15 active:scale-[0.98] transition-all cursor-pointer border-none outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </div>

        {/* Notifications Preference */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-3xs space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 border border-orange-200/50 text-orange-600 shrink-0">
              <Bell size={16} />
            </div>
            <div>
              <h4 className="text-[0.92rem] font-extrabold text-ink-900 font-display leading-tight">
                Preferensi Notifikasi
              </h4>
              <p className="text-[0.72rem] text-ink-400 font-medium mt-0.5">
                Atur pemberitahuan penting terkait aktivitas kampanye dan transaksi Anda
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/60 hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200 min-w-0"
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <strong className="text-xs font-extrabold text-ink-900 truncate">
                    {n.label}
                  </strong>
                  <span className="text-[0.72rem] font-medium text-ink-500 line-clamp-1">
                    {n.desc}
                  </span>
                </div>
                <Toggle enabled={n.enabled} onClick={() => handleToggleNotification(n.id)} />
              </div>
            ))}
          </div>
        </div>

        {/* Zona Berbahaya */}
        <div className="bg-red-50/40 border border-red-200/80 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <h4 className="text-[0.88rem] font-[850] text-red-700 font-display">
              Zona Berbahaya
            </h4>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap pt-1">
            <div className="flex flex-col gap-1 max-w-xl">
              <strong className="text-xs font-extrabold text-neutral-900">
                Penonaktifan Akun
              </strong>
              <p className="text-[0.74rem] text-neutral-500 leading-relaxed">
                Untuk melindungi keamanan saldo escrow dan kampanye yang sedang berjalan, penonaktifan akun diproses melalui verifikasi Tim Bantuan Marketiv.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-300 hover:border-red-400 text-xs font-bold rounded-xl shadow-3xs hover:shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
            >
              Hubungi Bantuan
            </button>
          </div>
        </div>

        <HelpAdminModal open={isHelpModalOpen} onOpenChange={setIsHelpModalOpen} role="umkm" />
      </UmkmPageWrapper>
    </UmkmDashboardChrome>
  );
}
