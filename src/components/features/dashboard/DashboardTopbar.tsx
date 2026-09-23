"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { logoMarketivPng } from "@/assets/icons";
import { useSidebar } from "@/components/ui/sidebar";
import { getNotifications } from "@/services/shared/notification.service";
import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";
import { realtimeClient, tableChannels } from "@/lib/appwrite/realtime";

import { useUmkmIdentity } from "./UmkmIdentityContext";
import { DashboardProfileAvatar } from "@/components/features/dashboard/shared/DashboardProfileAvatar";
import { NotificationHeaderDropdown } from "@/components/features/shared/NotificationHeaderDropdown";

// Dihapus: PROFILE_AVATAR_IMAGE_URL hardcoded (fix P0-B 2026-08-08).
// Avatar sekarang dibaca dari profil UMKM yang nyata via prop `avatarUrl` atau context.

const BASE = "/dashboard/umkm";

interface PageMeta {
  title: string;
  subtitle: string;
}

function getPageMeta(pathname: string): PageMeta {
  const map: Record<string, PageMeta> = {
    [BASE]:                      { title: "Dashboard",    subtitle: "Ringkasan bisnis Anda" },
    [`${BASE}/campaign`]:        { title: "Kampanye",     subtitle: "Kelola semua kampanye" },
    [`${BASE}/campaign/buat`]:   { title: "Buat Kampanye", subtitle: "Panduan pembuatan kampanye" },
    [`${BASE}/kreator`]:         { title: "Kreator",      subtitle: "Temukan & kelola kreator" },
    [`${BASE}/negosiasi`]:       { title: "Negosiasi",    subtitle: "Kelola penawaran & diskusi" },
    [`${BASE}/review-rate-card`]: { title: "Review Pekerjaan", subtitle: "Tinjau hasil kerja Rate Card" },
    [`${BASE}/keuangan`]:        { title: "Keuangan",     subtitle: "Transaksi & Dana Aman" },
    [`${BASE}/analitik`]:        { title: "Analitik",     subtitle: "Performa & Laporan" },
    [`${BASE}/pengaturan`]:      { title: "Pengaturan",   subtitle: "Profil & Pengaturan Akun" },
    [`${BASE}/panduan`]:         { title: "FAQ & Peraturan", subtitle: "Kebijakan & bantuan" },
    [`${BASE}/notifikasi`]:      { title: "Notifikasi",   subtitle: "Pusat notifikasi akun" },
  };
  if (map[pathname]) return map[pathname];
  if (new RegExp(`^${BASE}/campaign/[^/]+$`).test(pathname))
    return { title: "Detail Kampanye", subtitle: "Informasi lengkap kampanye" };
  if (new RegExp(`^${BASE}/kreator/[^/]+$`).test(pathname))
    return { title: "Profil Kreator", subtitle: "Detail informasi kreator" };
  if (new RegExp(`^${BASE}/negosiasi/[^/]+$`).test(pathname))
    return { title: "Ruang Negosiasi", subtitle: "Detail sesi negosiasi" };
  if (new RegExp(`^${BASE}/review-rate-card/[^/]+$`).test(pathname))
    return { title: "Detail Review", subtitle: "Tinjau hasil kerja Rate Card" };
  return { title: "Marketiv", subtitle: "" };
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const parts = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: "Dashboard", href: "/dashboard/umkm" }];
  
  if (parts.length <= 2) {
    return items;
  }
  
  const mainModule = parts[2];
  const labelMap: Record<string, string> = {
    campaign: "Kampanye",
    kreator: "Direktori Kreator",
    negosiasi: "Negosiasi",
    "review-rate-card": "Review Pekerjaan",
    keuangan: "Keuangan",
    analitik: "Analitik",
    pengaturan: "Pengaturan",
    panduan: "FAQ & Peraturan",
    notifikasi: "Notifikasi",
  };
  
  if (labelMap[mainModule]) {
    items.push({ 
      label: labelMap[mainModule], 
      href: `/dashboard/umkm/${mainModule}` 
    });
  } else {
    items.push({ 
      label: mainModule.charAt(0).toUpperCase() + mainModule.slice(1)
    });
  }
  
  if (parts.length > 3) {
    const subModule = parts[3];
    if (subModule === "buat") {
      items.push({ label: "Buat Baru" });
    } else {
      if (mainModule === "campaign") {
        items.push({ label: "Detail" });
      } else if (mainModule === "kreator") {
        items.push({ label: "Profil" });
      } else if (mainModule === "negosiasi") {
        items.push({ label: "Detail" });
      } else {
        items.push({ label: "Detail" });
      }
    }
  }
  
  return items;
}

interface DashboardTopbarProps {
  onOpenSidebar?: () => void;
  /** URL logo/avatar profil UMKM. Kosong = tampilkan inisial fallback. */
  avatarUrl?: string;
}

export function DashboardTopbar({ avatarUrl: propAvatarUrl }: DashboardTopbarProps) {
  const pathname = usePathname();
  const { title } = getPageMeta(pathname);
  const { toggleSidebar } = useSidebar();
  const { identity } = useUmkmIdentity();
  const [unreadCount, setUnreadCount] = useState(0);

  const avatarUrl = identity?.avatarUrl ?? propAvatarUrl;
  const businessName = identity?.businessName;

  const loadUnreadCount = useCallback(() => {
    void getNotifications("umkm").then((result) => {
      if (result.success && result.data) {
        setUnreadCount(result.data.filter((notification) => !notification.isRead).length);
      }
    });
  }, []);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    if (DATA_SOURCE_CONFIG.useMockData) return;
    const channels = tableChannels("notifications");
    if (channels.length === 0) return;

    return realtimeClient.subscribe(channels, () => loadUnreadCount());
  }, [loadUnreadCount]);
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header
      className="sticky top-0 z-40 shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-[80px]"
      style={{
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(17, 24, 39, 0.05)",
        boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.02), 0 1px 0 rgba(17, 24, 39, 0.03)",
      }}
    >
      {/* ── Left side ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0 flex-1">

        {/* Mobile hamburger — hidden on md+ (sidebar always visible there) */}
        <button
          onClick={toggleSidebar}
          className="md:hidden w-10.5 h-10.5 flex items-center justify-center rounded-xl text-ink-600 hover:bg-neutral-100/80 active:scale-95 transition-all duration-150 cursor-pointer shrink-0 border border-neutral-200/60 bg-white/70 shadow-3xs"
          aria-label="Buka menu"
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        {/* Mobile: Marketiv brand mark */}
        <div className="flex items-center gap-2.5 md:hidden min-w-0">
          <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-3xs border border-neutral-200/80">
            <Image
              src={logoMarketivPng}
              alt="Marketiv Logo"
              width={28}
              height={28}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <strong className="block text-[.92rem] font-extrabold text-ink-900 leading-none tracking-[-0.03em] font-display truncate">
              Marketiv
            </strong>
            <span className="block text-[.68rem] text-ink-400 font-semibold mt-px leading-none truncate">
              {title}
            </span>
          </div>
        </div>

        {/* Desktop: Breadcrumbs navigation */}
        <nav className="hidden md:flex items-center gap-2.5 text-[0.84rem] font-bold text-neutral-400 select-none">
          {breadcrumbs.map((item, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && <span className="text-neutral-300 font-medium">/</span>}
                {isLast ? (
                  <span className="text-ink-900 font-extrabold tracking-tight">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href || "#"}
                    className="hover:text-ink-900 transition-colors duration-150 no-underline"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}

        </nav>
      </div>

      {/* ── Right: actions ────────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification bell dropdown */}
        <NotificationHeaderDropdown theme="umkm" />

        {/* Avatar — menggunakan DashboardProfileAvatar dari context */}
        <Link
          href="/dashboard/umkm/pengaturan"
          className="w-11 h-11 rounded-xl border border-neutral-200/70 shadow-3xs overflow-hidden hover:scale-105 hover:shadow-[0_4px_12px_rgba(249,115,22,.18)] active:scale-95 transition-all duration-200 relative block shrink-0 cursor-pointer"
          aria-label="Profil akun"
        >
          <DashboardProfileAvatar
            avatarUrl={avatarUrl}
            name={businessName}
            size="sm"
            variant="umkm"
            className="h-full w-full rounded-none"
          />
        </Link>
      </div>
    </header>
  );
}
