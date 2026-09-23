"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logoMarketivPng } from "@/assets/icons";
import {
  LayoutDashboard,
  Briefcase,
  PlayCircle,
  MessageCircle,
  Tag,
  Wallet,
  Settings,
  HelpCircle,
  LogOut,
  BadgeCheck,
  ArrowRight,
  X,
  Bell,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { routes } from "@/lib/constants/routes";
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
import { getCreatorActiveWorks } from "@/services/creator/creator-dashboard.service";
import {
  useUnreadNotificationCount,
  formatUnreadBadge,
} from "@/components/features/shared/NotificationProvider";

import { useCreatorIdentity } from "./CreatorIdentityContext";
import { DashboardProfileAvatar } from "@/components/features/dashboard/shared/DashboardProfileAvatar";

interface CreatorSidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SIDEBAR_ITEMS: CreatorSidebarItem[] = [
  { label: "Overview", href: "/dashboard/kreator", icon: LayoutDashboard },
  { label: "Job Pool", href: "/dashboard/kreator/job-pool", icon: Briefcase },
  { label: "Pekerjaan Aktif", href: "/dashboard/kreator/pekerjaan-aktif", icon: PlayCircle },
  { label: "Rate Card", href: "/dashboard/kreator/rate-card", icon: Tag },
  { label: "Negosiasi", href: "/dashboard/kreator/negosiasi", icon: MessageCircle },
  { label: "Keuangan", href: "/dashboard/kreator/keuangan", icon: Wallet },
  { label: "Notifikasi", href: "/dashboard/kreator/notifikasi", icon: Bell },
];

export interface CreatorDashboardSidebarProps {
  displayName?: string;
  avatarUrl?: string;
  verificationStatus?: string;
  creatorName?: string;
  creatorHandle?: string;
  isSidebarOpen?: boolean;
  onCloseSidebar?: () => void;
}

export function CreatorDashboardSidebar({
  displayName,
  avatarUrl: propAvatarUrl,
  verificationStatus,
  creatorName,
  onCloseSidebar,
}: CreatorDashboardSidebarProps) {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();
  const { identity } = useCreatorIdentity();
  const isCollapsed = state === "collapsed";

  const nameToDisplay = identity?.name || creatorName || displayName || "Kreator";
  const avatarUrl = identity?.avatarUrl ?? propAvatarUrl;
  const isVerified = identity ? identity.isVerified : verificationStatus === "terverifikasi";

  const unreadNotifCount = useUnreadNotificationCount();
  const notifBadge = formatUnreadBadge(unreadNotifCount);

  const [activeJobsCount, setActiveJobsCount] = useState<number>(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    async function loadActiveJobsCount() {
      try {
        const res = await getCreatorActiveWorks();
        if (res.success && res.data) {
          const activeCount = res.data.filter((w) => {
            return w.status === "claimed" || w.status === "submitted";
          }).length;
          setActiveJobsCount(activeCount);
        }
      } catch {
        setActiveJobsCount(0);
      }
    }
    loadActiveJobsCount();
  }, []);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 transition-all duration-300 bg-[#0d1b2e]"
      style={{
        background: "linear-gradient(180deg, #0d1b2e 0%, #0a1626 100%)",
        color: "rgba(255,255,255,.7)",
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
        aria-label={state === "collapsed" ? "Perluas Menu" : "Sembunyikan Menu"}
      >
        {state === "collapsed" ? (
          <ArrowRight className="size-3.5" strokeWidth={2.5} />
        ) : (
          <X className="size-3.5" strokeWidth={2.5} />
        )}
      </button>

      {/* Brand Header */}
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
              width={36}
              height={36}
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
            <span
              className="block mt-[3px] text-[.65rem] font-semibold tracking-wide uppercase"
              style={{ color: "rgba(255,255,255,.32)" }}
            >
              Dashboard Kreator
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Navigation Content */}
      <SidebarContent className="px-3 py-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2 !overflow-y-auto custom-sidebar-scrollbar">
        <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard/kreator"
                ? pathname === "/dashboard/kreator"
                : pathname.startsWith(item.href);
            const badge =
              item.href === "/dashboard/kreator/notifikasi" ? notifBadge : null;

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
                  style={
                    isActive
                      ? {
                          background:
                            "linear-gradient(135deg, rgba(124,58,237,.22) 0%, rgba(139,92,246,.14) 100%)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,.08), 0 4px 16px rgba(124,58,237,.12)",
                          border: "1px solid rgba(124,58,237,.28)",
                        }
                      : {
                          border: "1px solid transparent",
                        }
                  }
                >
                  <Link
                    href={item.href}
                    onClick={onCloseSidebar}
                    className={cn(
                      "flex items-center gap-3 w-full",
                      "group-data-[collapsible=icon]:justify-center"
                    )}
                  >
                    {/* Active left accent bar */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full group-data-[collapsible=icon]:hidden"
                        style={{ background: "linear-gradient(180deg, #7c3aed, #8b5cf6)" }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative shrink-0">
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-all duration-200",
                          isActive
                            ? "text-violet-400 group-hover:text-violet-400"
                            : "text-white/30 group-hover:text-white/70",
                        )}
                      />
                      {badge && (
                        <span
                          className={cn(
                            "hidden group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:-right-1.5",
                            "group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-[16px] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
                            "group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:px-0.5 group-data-[collapsible=icon]:text-[9px] group-data-[collapsible=icon]:font-black group-data-[collapsible=icon]:leading-none",
                            "bg-violet-500 text-white border border-[#0d1b2e]",
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[0.95rem] tracking-[-0.015em] group-data-[collapsible=icon]:hidden transition-colors duration-200 flex-1 flex items-center justify-between",
                        isActive
                          ? "font-[760] text-white group-hover:text-white"
                          : "font-[640] text-white/45 group-hover:text-white/80"
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      {badge && (
                        <span className="ml-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[9px] font-black leading-none text-white shrink-0">
                          {badge}
                        </span>
                      )}
                      {item.href === "/dashboard/kreator/pekerjaan-aktif" && activeJobsCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center h-5 px-1.5 rounded-full text-[0.68rem] font-extrabold bg-violet-500/25 text-violet-300 border border-violet-500/30">
                          {activeJobsCount}
                        </span>
                      )}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* Section: Support / Bantuan */}
        <div className="mt-6 px-3.5 group-data-[collapsible=icon]:hidden">
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
              href="/dashboard/kreator/panduan"
              onClick={onCloseSidebar}
              className="flex items-center gap-2.5 py-2 px-1 rounded-lg text-white/45 hover:text-white/80 transition-all duration-150 text-[0.88rem] font-[650] no-underline group"
            >
              <HelpCircle size={19} className="text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
              <span>FAQ & Peraturan</span>
            </Link>
          </div>
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter
        className="px-3 pb-3 pt-2 gap-0.5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pb-2 group-data-[collapsible=icon]:items-center"
        style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}
      >
        <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Pengaturan"
              className="flex items-center gap-3 min-h-[46px] px-3.5 rounded-[14px] transition-all duration-200 cursor-pointer text-white/30 hover:text-white/80 group-data-[collapsible=icon]:min-h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:rounded-2xl"
              style={{ border: "1px solid transparent" }}
            >
              <Link
                href={routes.kreatorSettings}
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

        {/* User Identity */}
        <div
          className="flex items-center gap-2.5 mt-1.5 px-3 py-2.5 rounded-[14px] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:mt-1 transition-all duration-200"
          style={{
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.07)",
          }}
        >
          <DashboardProfileAvatar
            avatarUrl={avatarUrl}
            name={nameToDisplay}
            size="md"
            variant="kreator"
            className="w-9 h-9 shrink-0 rounded-[10px] group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:rounded-[13px]"
          />

          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <strong
              className="block text-[0.84rem] text-white leading-[1.2] truncate"
              style={{ letterSpacing: "-.02em" }}
            >
              {nameToDisplay}
            </strong>
            <span className="flex items-center gap-1 mt-[2px]">
              {isVerified && <BadgeCheck size={10.5} className="text-violet-400 shrink-0" />}
              <span className="text-[.66rem] font-[650] text-violet-300/80 capitalize">
                Kreator {isVerified ? "Terverifikasi" : "Akun"}
              </span>
            </span>
          </div>
        </div>
      </SidebarFooter>

      <LogoutConfirmDialog
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        accent="purple"
      />
      <HelpAdminModal
        open={showHelpModal}
        onOpenChange={setShowHelpModal}
        role="kreator"
      />
    </Sidebar>
  );
}
