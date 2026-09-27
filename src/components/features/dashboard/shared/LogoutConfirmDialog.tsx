"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Store, Video, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/providers/AuthProvider";
import { routes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type LogoutAccent = "orange" | "purple" | "red";

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accent?: LogoutAccent;
}

const DIALOG_CONFIG = {
  orange: {
    heroImage: "/umkm_logout_hero.jpg",
    badgeLabel: "Pemilik UMKM",
    badgeIcon: Store,
    badgeClass: "bg-orange-500/80 text-white border-orange-300/40",
    title: "Keluar dari Dashboard UMKM?",
    description:
      "Sesi bisnis Anda akan diakhiri. Anda perlu masuk kembali untuk mengelola kampanye, pesanan, dan Dana Aman.",
    btnClass:
      "bg-orange-500 hover:bg-orange-600 focus-visible:outline-orange-500/40 shadow-orange-500/25",
    btnLabel: "Ya, Keluar Akun UMKM",
  },
  purple: {
    heroImage: "/kreator_logout_hero.jpg",
    badgeLabel: "Konten Kreator",
    badgeIcon: Video,
    badgeClass: "bg-violet-600/80 text-white border-violet-300/40",
    title: "Keluar dari Dashboard Kreator?",
    description:
      "Sesi kreator Anda akan diakhiri. Anda perlu masuk kembali untuk mengambil lowongan, paket harga, dan pencairan saldo.",
    btnClass:
      "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 focus-visible:outline-violet-500/40 shadow-violet-500/25",
    btnLabel: "Ya, Keluar Akun Kreator",
  },
  red: {
    heroImage: "/umkm_logout_hero.jpg",
    badgeLabel: "Akun Marketiv",
    badgeIcon: LogOut,
    badgeClass: "bg-red-500/80 text-white border-red-300/40",
    title: "Keluar dari Marketiv?",
    description: "Sesi Anda akan diakhiri. Anda perlu masuk kembali untuk mengakses akun Anda.",
    btnClass:
      "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/25",
    btnLabel: "Ya, Keluar Akun",
  },
} as const satisfies Record<LogoutAccent, object>;

/**
 * Dialog Konfirmasi Logout Spesifik Peran (UMKM vs Kreator).
 *
 * Menampilkan header visual 3D spesifik peran dengan rounded border halus,
 * badge identitas peran, serta CTA action role-spesifik.
 */
export function LogoutConfirmDialog({
  open,
  onOpenChange,
  accent = "orange",
}: LogoutConfirmDialogProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);

  const config = DIALOG_CONFIG[accent] || DIALOG_CONFIG.orange;
  const BadgeIcon = config.badgeIcon;

  async function handleLogout() {
    setPending(true);
    try {
      await logout();
      router.replace(routes.login);
    } catch {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <AlertDialogContent className="w-full max-w-[420px] overflow-hidden rounded-[2.2rem] border border-neutral-200/90 bg-white p-0 shadow-2xl transition-all duration-300">
        {/* Top Visual Header Banner with Role-Specific 3D Illustration */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900 select-none">
          <Image
            src={config.heroImage}
            alt="Ilustrasi keluar akun"
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            priority
          />
          {/* Subtle gradient vignette overlays */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30" />

          {/* Top Role Badge */}
          <div className="absolute top-3.5 left-4 z-10">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.72rem] font-[800] backdrop-blur-md shadow-sm",
                config.badgeClass
              )}
            >
              <BadgeIcon className="h-3.5 w-3.5" />
              <span>{config.badgeLabel}</span>
            </span>
          </div>
        </div>

        {/* Text Content */}
        <div className="px-6 pt-4 pb-2 sm:px-7">
          <AlertDialogHeader className="text-left space-y-2">
            <AlertDialogTitle className="font-display text-xl font-[900] tracking-tight text-ink-900">
              {config.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-semibold leading-relaxed text-ink-500">
              {config.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Action Buttons */}
          <AlertDialogFooter className="mt-6 pb-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-2.5">
            <AlertDialogCancel
              disabled={pending}
              className="w-full sm:flex-1 min-h-[46px] rounded-2xl border border-neutral-200/90 bg-neutral-100/80 hover:bg-neutral-200/80 text-xs font-[800] text-ink-700 outline-none transition-all m-0"
            >
              Batal
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleLogout}
              disabled={pending}
              className={cn(
                "w-full sm:flex-1 min-h-[46px] rounded-2xl text-xs font-[800] text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 m-0",
                config.btnClass
              )}
            >
              {pending ? "Mengeluarkan…" : config.btnLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
