"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logoMarketivPng } from "@/assets/icons";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  MessageCircle,
  ClipboardCheck,
  Wallet,
  TrendingUp,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  ArrowRight,
  X,
  Bell,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useUnreadNotificationCount,
  formatUnreadBadge,
} from "@/components/features/shared/NotificationProvider";
import { LogoutConfirmDialog } from "@/components/features/dashboard/shared/LogoutConfirmDialog";
import { HelpAdminModal } from "@/components/features/dashboard/shared/HelpAdminModal";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getNegotiations } from "@/services/umkm/umkm-dashboard.service";
import type { NegotiationStage } from "@/types/domain";


import { useUmkmIdentity } from "./UmkmIdentityContext";
import { DashboardProfileAvatar } from "@/components/features/dashboard/shared/DashboardProfileAvatar";

/**
 * Tahap yang berarti kreator memang sedang mengerjakan sesuatu — plus labelnya.
 * Tahap negosiasi (chatting/offer_*) dan tahap selesai/batal sengaja absen:
 * panel ini tentang pekerjaan berjalan, bukan tentang percakapan.
 */
const STAGE_IN_PROGRESS: Partial<Record<NegotiationStage, string>> = {
  in_progress: "Sedang Dikerjakan",
  revision: "Revisi Diminta",
  approved: "Menunggu Pencairan",
};

interface SidebarNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  exact?: boolean;
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard",  href: "/dashboard/umkm",            icon: LayoutDashboard, exact: true },
  { label: "Kampanye",   href: "/dashboard/umkm/campaign",   icon: Megaphone },
  { label: "Kreator",    href: "/dashboard/umkm/kreator",    icon: Users },
  { label: "Negosiasi",  href: "/dashboard/umkm/negosiasi",  icon: MessageCircle },
  { label: "Review Pekerjaan", href: "/dashboard/umkm/review-rate-card", icon: ClipboardCheck },
  { label: "Keuangan",   href: "/dashboard/umkm/keuangan",   icon: Wallet },
  { label: "Analitik",   href: "/dashboard/umkm/analitik",   icon: TrendingUp },
  { label: "Notifikasi", href: "/dashboard/umkm/notifikasi", icon: Bell },
];

interface DashboardSidebarProps {
  businessName?: string;
  isSidebarOpen?: boolean;
  onCloseSidebar?: () => void;
  isVerified?: boolean;
}

export function DashboardSidebar({
  businessName: propBusinessName,
  isVerified: propIsVerified,
  onCloseSidebar,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const { identity } = useUmkmIdentity();
  const isCollapsed = state === "collapsed";
  const unreadNotifCount = useUnreadNotificationCount();
  const notifBadge = formatUnreadBadge(unreadNotifCount);

  const businessName = identity?.businessName || propBusinessName || "";
  const isVerified = identity ? identity.isVerified : (propIsVerified ?? false);
  const avatarUrl = identity?.avatarUrl;
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  /**
   * Panel "Kreator Sedang Bekerja".
   *
   * Sebelum `s5-sidebar-fabrikasi`, isinya tiga baris hardcode di dalam
   * useState — Sulianto/Nadia/Budi dengan foto Unsplash, semuanya di campaign
   * "Rasa Nusantara Food Review". Karena melekat di sidebar, data karangan itu
   * tampil di SETIAP layar, termasuk pada akun yang belum punya campaign apa pun.
   *
   * Sumber nyatanya adalah order yang sedang berjalan (`get-umkm-negotiations`).
   * Kalau kosong, panel tidak dirender sama sekali.
   */
  const [activeCreators, setActiveCreators] = useState<Array<{
    name: string;
    avatar: string;
    campaignTitle: string;
    status: string;
  }>>([]);

  useEffect(() => {
    let active = true;
    void getNegotiations().then((res) => {
      if (!active || !res.success || !res.data) return;
      setActiveCreators(
        res.data
          .filter((n) => STAGE_IN_PROGRESS[n.stage] !== undefined)
          .slice(0, 5)
          .map((n) => ({
            name: n.creatorName,
            avatar: n.creatorAvatarUrl,
            campaignTitle: n.projectTitle,
            status: STAGE_IN_PROGRESS[n.stage] as string,
          }))
      );
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Sidebar
      className="border-r-0"
      collapsible="icon"
      style={{
        background: "linear-gradient(180deg, #0d1b2e 0%, #0a1525 60%, #091220 100%)",
        boxShadow: "4px 0 40px rgba(0,0,0,.28), 1px 0 0 rgba(255,255,255,.04)",
      }}
    >
      {/* Protruding Tab Toggle Button (Shopeers/Dashify Style) — centered vertically on viewport */}
      <button
        onClick={toggleSidebar}
        className="absolute z-50 flex items-center justify-center rounded-r-md cursor-pointer transition-all duration-250 bg-[#0d1b2e] text-white/60 hover:text-white border border-l-0 border-white/5 shadow-[2px_0_8px_rgba(0,0,0,0.15)]"
        style={{
          right: "-22px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "22px",
          height: "48px"
        }}
        title={state === "collapsed" ? "Perluas Menu" : "Sembunyikan Menu"}
      >
        {state === "collapsed" ? (
          <ArrowRight className="size-3.5" strokeWidth={2.5} />
        ) : (
          <X className="size-3.5" strokeWidth={2.5} />
        )}
      </button>

      {/* ── Brand Header ──────────────────────────────────────── */}
      <SidebarHeader
        className="relative flex flex-row items-center justify-between gap-3 px-4 py-3.5 min-h-[68px] !overflow-visible"
        style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}
      >
        <div className="flex items-center gap-3 min-w-0 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
          {/* Logo mark */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm border border-white/10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:rounded-lg transition-all duration-300">
            <Image
              src={logoMarketivPng}
              alt="Marketiv Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>

          {/* Brand text */}
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <strong
              className="block text-[.96rem] font-extrabold text-white leading-none font-display"
              style={{ letterSpacing: "-.03em" }}
            >
              Marketiv
            </strong>
            <span className="block mt-[3px] text-[.65rem] font-semibold tracking-wide uppercase"
              style={{ color: "rgba(255,255,255,.32)" }}>
              Dashboard UMKM
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Main Navigation ───────────────────────────────────── */}
      <SidebarContent className="px-3 py-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2 !overflow-y-auto custom-sidebar-scrollbar">
        <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center">
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const badge =
              item.href === "/dashboard/umkm/notifikasi" ? notifBadge : null;

            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    "relative flex items-center gap-3 min-h-[50px] px-4 rounded-[14px] transition-all duration-200 cursor-pointer overflow-hidden",
                    "group-data-[collapsible=icon]:min-h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:rounded-2xl",
                    isActive
                      ? "text-white font-bold hover:bg-transparent hover:text-white"
                      : "hover:text-white/90 hover:bg-white/5"
                  )}
                  style={isActive ? {
                    background: "linear-gradient(135deg, rgba(249,115,22,.22) 0%, rgba(251,122,24,.14) 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 4px 16px rgba(249,115,22,.12)",
                    border: "1px solid rgba(249,115,22,.22)",
                  } : {
                    border: "1px solid transparent",
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={onCloseSidebar}
                    data-onboarding={item.href === "/dashboard/umkm/campaign" ? "campaign-nav" : undefined}
                    className={cn(
                      "flex items-center gap-3 w-full",
                      "group-data-[collapsible=icon]:justify-center"
                    )}
                  >
                    {/* Active left accent bar */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full group-data-[collapsible=icon]:hidden"
                        style={{ background: "linear-gradient(180deg, #f97316, #fb923c)" }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative shrink-0">
                      <item.icon
                        size={22}
                        className={cn(
                          "shrink-0 transition-all duration-200",
                          isActive
                            ? "text-orange-400 group-hover:text-orange-400"
                            : "text-white/30 group-hover:text-white/70",
                        )}
                      />
                      {badge && (
                        <span
                          className={cn(
                            "hidden group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:-right-1.5",
                            "group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-[16px] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
                            "group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:px-0.5 group-data-[collapsible=icon]:text-[9px] group-data-[collapsible=icon]:font-black group-data-[collapsible=icon]:leading-none",
                            "bg-orange-500 text-white border border-[#0d1b2e]",
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[0.95rem] tracking-[-0.015em] group-data-[collapsible=icon]:hidden transition-colors duration-200 flex-1 flex items-center justify-between gap-2 min-w-0",
                        isActive
                          ? "font-[760] text-white group-hover:text-white"
                          : "font-[640] text-white/45 group-hover:text-white/80",
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      {badge && (
                        <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-black leading-none text-white shrink-0">
                          {badge}
                        </span>
                      )}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* Section 2: Kreator Sedang Bekerja (Conditional) */}
        {activeCreators && activeCreators.length > 0 && (
          <div className="mt-7 px-3.5 group-data-[collapsible=icon]:hidden">
            <span className="block text-[0.66rem] font-[800] text-white/20 uppercase tracking-widest mb-3 select-none">
              Kreator Sedang Bekerja
            </span>
            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto custom-sidebar-scrollbar pr-0.5">
              {activeCreators.slice(0, 5).map((creator, idx) => (
                <Link
                  key={idx}
                  href="/dashboard/umkm/campaign"
                  className="flex items-center gap-3 p-2.5 rounded-[16px] bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.09] transition-all duration-200 cursor-pointer no-underline group"
                  style={{
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                  }}
                >
                  <div className="relative w-8.5 h-8.5 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-3xs">
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#0d1b2e] animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[0.82rem] font-bold text-white/85 truncate group-hover:text-white transition-colors duration-150">
                      {creator.name}
                    </span>
                    <span className="block text-[0.64rem] font-semibold text-white/35 truncate mt-0.5">
                      {creator.campaignTitle}
                    </span>
                    <span className="block text-[0.6rem] font-[750] text-orange-400 mt-0.5">
                      {creator.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Support / Bantuan */}
        <div className="mt-7 px-3.5 group-data-[collapsible=icon]:hidden">
          <span className="block text-[0.66rem] font-[800] text-white/20 uppercase tracking-widest mb-2.5 select-none">
            Butuh Bantuan?
          </span>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-2.5 py-2 px-1 rounded-lg text-white/45 hover:text-white/80 transition-all duration-150 text-[0.88rem] font-[650] bg-transparent border-none outline-none cursor-pointer text-left w-full group"
            >
              <MessageCircle size={19} className="text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
              <span>Hubungi Admin</span>
            </button>
            <Link
              href="/dashboard/umkm/panduan"
              className="flex items-center gap-2.5 py-2 px-1 rounded-lg text-white/45 hover:text-white/80 transition-all duration-150 text-[0.88rem] font-[650] no-underline group"
            >
              <HelpCircle size={19} className="text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
              <span>FAQ & Peraturan</span>
            </Link>
          </div>
        </div>

      </SidebarContent>

      {/* ── Footer — utility + user strip ─────────────────────── */}
      <SidebarFooter
        className="px-3 pb-3 pt-2 gap-0.5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pb-2 group-data-[collapsible=icon]:items-center"
        style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}
      >
        <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center">
          {/* Pengaturan */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Pengaturan"
              className="flex items-center gap-3 min-h-[46px] px-3.5 rounded-[14px] transition-all duration-200 cursor-pointer text-white/30 hover:text-white/80 group-data-[collapsible=icon]:min-h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:rounded-2xl"
              style={{ border: "1px solid transparent" }}
            >
              <Link
                href="/dashboard/umkm/pengaturan"
                onClick={onCloseSidebar}
                className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center"
              >
                <Settings size={20} className="shrink-0" />
                <span className="text-[0.9rem] font-[640] tracking-tight group-data-[collapsible=icon]:hidden">
                  Pengaturan
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Keluar */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Keluar"
              className="flex items-center gap-3 min-h-[46px] px-3.5 rounded-[14px] transition-all duration-200 cursor-pointer text-red-400/50 hover:text-red-300 hover:bg-red-500/8 group-data-[collapsible=icon]:min-h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:rounded-2xl"
              style={{ border: "1px solid transparent" }}
            >
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center bg-transparent border-none outline-none text-left"
              >
                <LogOut size={20} className="shrink-0" />
                <span className="text-[0.9rem] font-[640] tracking-tight group-data-[collapsible=icon]:hidden">
                  Keluar
                </span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User identity strip */}
        <div
          className="flex items-center gap-2.5 mt-1.5 px-3 py-2.5 rounded-[14px] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:mt-1 transition-all duration-200"
          style={{
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.07)",
          }}
        >
          <DashboardProfileAvatar
            avatarUrl={avatarUrl}
            name={businessName}
            size="md"
            variant="umkm"
            className="w-9 h-9 shrink-0 rounded-[10px] group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:rounded-[13px]"
          />

          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <strong
              className="block text-[0.84rem] text-white leading-[1.2] truncate"
              style={{ letterSpacing: "-.02em" }}
            >
              {businessName}
            </strong>
            {isVerified && (
              <span className="flex items-center gap-1 mt-[2px]">
                <BadgeCheck size={10.5} className="text-emerald-400 shrink-0" />
                <span className="text-[.66rem] font-[650] text-emerald-400/80">
                  UMKM Terverifikasi
                </span>
              </span>
            )}
          </div>
        </div>
      </SidebarFooter>

      <LogoutConfirmDialog
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        accent="orange"
      />
      <HelpAdminModal
        open={showHelpModal}
        onOpenChange={setShowHelpModal}
        role="umkm"
      />
    </Sidebar>
  );
}
