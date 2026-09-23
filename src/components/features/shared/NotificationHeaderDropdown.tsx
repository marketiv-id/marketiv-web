"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Megaphone,
  Wallet,
  MessageSquare,
  Tag,
  Settings2,
  ChevronRight,
  Sparkles,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppNotification, NotifType } from "@/types/notification.types";
import {
  useNotifications,
  formatUnreadBadge,
} from "./NotificationProvider";
import { AppNotificationDetailDialog } from "./AppNotificationDetailDialog";

export interface NotificationHeaderDropdownProps {
  theme: "kreator" | "umkm";
}

const ICON_MAP: Record<
  NotifType,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    iconBg: string;
    iconColor: string;
  }
> = {
  campaign: { icon: Megaphone, iconBg: "bg-orange-50", iconColor: "text-orange-500" },
  keuangan: { icon: Wallet, iconBg: "bg-emerald-50", iconColor: "text-emerald-500" },
  negosiasi: { icon: MessageSquare, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
  rate_card: { icon: Tag, iconBg: "bg-purple-50", iconColor: "text-purple-500" },
  sistem: { icon: Settings2, iconBg: "bg-slate-50", iconColor: "text-slate-500" },
};

function relativeTimeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}j lalu`;
  const d = Math.floor(diff / 86400000);
  if (d < 7) return `${d}h lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function NotificationHeaderDropdown({ theme }: NotificationHeaderDropdownProps) {
  const router = useRouter();

  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const {
    notifs,
    unreadCount,
    markAsRead,
    markAllRead,
    deleteNotif,
  } = useNotifications();

  const isKreator = theme === "kreator";
  const viewAllHref = isKreator ? "/dashboard/kreator/notifikasi" : "/dashboard/umkm/notifikasi";
  const badgeBg = isKreator ? "bg-violet-600" : "bg-orange-500";
  const textAccent = isKreator ? "text-violet-600 hover:text-violet-700" : "text-orange-600 hover:text-orange-700";

  const recentNotifs = notifs.slice(0, 6);

  const handleOpenDetail = (notif: AppNotification) => {
    setIsDropdownOpen(false);
    setSelectedNotif(notif);
    setIsDetailOpen(true);
    if (!notif.isRead) {
      void markAsRead(notif.id);
    }
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer border border-neutral-200/60 bg-white/70 shadow-3xs hover:shadow-2xs focus:outline-none focus:ring-2",
              isKreator
                ? "text-neutral-600 hover:text-neutral-900 focus:ring-violet-500/20"
                : "text-ink-500 hover:text-ink-800 focus:ring-orange-500/20"
            )}
            aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : "Notifikasi"}
          >
            <Bell size={20} strokeWidth={2} />
            {unreadCount > 0 && (
              <span
                className={cn(
                  "absolute -top-1 -right-1 z-10 flex h-4 min-w-[16px] max-w-[28px] items-center justify-center rounded-full border-2 border-white px-0.5 text-[10px] font-black leading-none text-white",
                  badgeBg,
                )}
              >
                {formatUnreadBadge(unreadCount)}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-80 sm:w-96 p-2 rounded-2xl shadow-xl bg-white border-neutral-200/90 z-50"
        >
          {/* Header */}
          <DropdownMenuLabel className="flex items-center justify-between px-3 py-2 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs sm:text-sm text-neutral-900">
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <span
                  className={cn(
                    "rounded-full text-white px-2 py-0.5 text-[10px] font-black shadow-xs",
                    badgeBg
                  )}
                >
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className={cn(
                  "text-[11px] font-extrabold cursor-pointer flex items-center gap-1 transition-all",
                  textAccent
                )}
                title="Tandai Semua Dibaca"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Dibaca</span>
              </button>
            )}
          </DropdownMenuLabel>

          {/* List items */}
          <div className="space-y-1 py-1.5 max-h-[360px] overflow-y-auto pr-0.5">
            {recentNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-400 space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 grid place-items-center text-neutral-400">
                  <Inbox className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-neutral-700">Tidak Ada Notifikasi</p>
                <p className="text-[11px] text-neutral-400">Notifikasi baru Anda akan tampil di sini.</p>
              </div>
            ) : (
              recentNotifs.map((n) => {
                const iconCfg = ICON_MAP[n.type] ?? ICON_MAP.sistem;
                const IconComp = iconCfg.icon;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleOpenDetail(n)}
                    className={cn(
                      "group relative flex items-start gap-3 rounded-xl p-3 text-xs transition-all cursor-pointer border",
                      !n.isRead
                        ? isKreator
                          ? "bg-violet-50/50 border-violet-100 hover:bg-violet-50"
                          : "bg-orange-50/50 border-orange-100 hover:bg-orange-50"
                        : "bg-white border-neutral-100 hover:bg-neutral-50"
                    )}
                  >
                    {/* Category Icon */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg grid place-items-center shrink-0 mt-0.5",
                        iconCfg.iconBg,
                        iconCfg.iconColor
                      )}
                    >
                      <IconComp size={15} />
                    </div>

                    {/* Text Details */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            "text-xs truncate",
                            !n.isRead ? "font-extrabold text-neutral-900" : "font-bold text-neutral-700"
                          )}
                        >
                          {n.title}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium shrink-0">
                          {relativeTimeShort(n.timestamp)}
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-500 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!n.isRead && (
                      <span className={cn("w-2 h-2 rounded-full shrink-0 mt-2", badgeBg)} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DropdownMenuSeparator className="my-1 border-neutral-100" />

          {/* Footer Link to full notifications page */}
          <Link
            href={viewAllHref}
            onClick={() => setIsDropdownOpen(false)}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 text-center text-xs font-extrabold cursor-pointer rounded-xl hover:bg-neutral-50 transition-all",
              textAccent
            )}
          >
            <span>Lihat Semua Notifikasi</span>
            <ChevronRight size={14} />
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Detail Dialog */}
      <AppNotificationDetailDialog
        notification={selectedNotif}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onActionClick={(href) => router.push(href)}
        onDelete={(id) => void deleteNotif(id)}
        theme={theme}
      />
    </>
  );
}
