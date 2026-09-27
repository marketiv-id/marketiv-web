"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Wallet,
  MessageSquare,
  Tag,
  Settings2,
  ExternalLink,
  Clock,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppNotification, NotifType } from "@/types/notification.types";

export interface AppNotificationDetailDialogProps {
  notification: AppNotification | null;
  isOpen: boolean;
  onClose: () => void;
  onActionClick: (href: string) => void;
  onDelete?: (id: string) => void;
  theme?: "kreator" | "umkm";
}

const CATEGORY_CONFIG: Record<
  NotifType,
  {
    label: string;
    badgeClass: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    iconColor: string;
  }
> = {
  campaign: {
    label: "Campaign",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200/80",
    icon: Megaphone,
    iconColor: "text-orange-500",
  },
  keuangan: {
    label: "Keuangan",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    icon: Wallet,
    iconColor: "text-emerald-500",
  },
  negosiasi: {
    label: "Negosiasi",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
    icon: MessageSquare,
    iconColor: "text-blue-500",
  },
  rate_card: {
    label: "Paket Harga",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200/80",
    icon: Tag,
    iconColor: "text-purple-500",
  },
  sistem: {
    label: "Sistem",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200/80",
    icon: Settings2,
    iconColor: "text-slate-500",
  },
};

function formatDetailTime(iso: string): { relative: string; full: string } {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);

  let relative = "Baru saja";
  if (m >= 1 && m < 60) relative = `${m} menit lalu`;
  else {
    const h = Math.floor(diff / 3600000);
    if (h < 24) relative = `${h} jam lalu`;
    else {
      const d = Math.floor(diff / 86400000);
      if (d < 7) relative = `${d} hari lalu`;
    }
  }

  const full = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return { relative, full };
}

export function AppNotificationDetailDialog({
  notification,
  isOpen,
  onClose,
  onActionClick,
  onDelete,
  theme = "umkm",
}: AppNotificationDetailDialogProps) {
  if (!notification) return null;

  const config = CATEGORY_CONFIG[notification.type] ?? CATEGORY_CONFIG.sistem;
  const CategoryIcon = config.icon;
  const timeInfo = formatDetailTime(notification.timestamp);

  const isKreator = theme === "kreator";
  const actionButtonCls = isKreator
    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
    : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg p-5 sm:p-6 bg-white border-neutral-200 rounded-2xl sm:rounded-3xl shadow-2xl transition-all">
        {/* Header */}
        <DialogHeader className="pr-6 space-y-2.5 border-b border-neutral-100 pb-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border",
                config.badgeClass
              )}
            >
              <CategoryIcon size={13} className={config.iconColor} />
              <span>{config.label}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
              <Clock size={12} className="text-neutral-400" />
              <span>{timeInfo.relative}</span>
            </div>
          </div>

          <DialogTitle className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight leading-snug">
            {notification.title}
          </DialogTitle>
        </DialogHeader>

        {/* Modal Body */}
        <div className="space-y-4 py-3 text-xs sm:text-sm">
          {/* Main Description Box */}
          <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/60 p-4 sm:p-5 space-y-2">
            <p className="text-neutral-700 text-xs sm:text-sm leading-relaxed font-medium whitespace-pre-line">
              {notification.message}
            </p>
          </div>

          {/* Timestamp info card */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-neutral-100/60 text-[11px] text-neutral-500 font-medium">
            <span className="text-neutral-400">Waktu Diterima:</span>
            <span className="font-semibold text-neutral-700">{timeInfo.full}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-neutral-100">
          {onDelete ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onDelete(notification.id);
                onClose();
              }}
              className="w-full sm:w-auto h-10 text-xs font-bold gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Hapus Notifikasi</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto h-10 text-xs font-bold border-neutral-200 text-neutral-700 hover:bg-neutral-100 rounded-xl"
            >
              Tutup
            </Button>

            {notification.actionHref && (
              <Button
                type="button"
                onClick={() => {
                  onActionClick(notification.actionHref!);
                  onClose();
                }}
                className={cn(
                  "w-full sm:w-auto h-10 text-xs font-extrabold gap-1.5 rounded-xl shadow-xs cursor-pointer transition-all",
                  actionButtonCls
                )}
              >
                <span>{notification.actionLabel ?? "Buka Halaman Terkait"}</span>
                <ExternalLink size={14} />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
