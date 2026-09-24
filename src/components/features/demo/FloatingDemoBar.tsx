"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { resetDemoStore } from "@/lib/demo/demo-store";
import { getMockRole, setMockRole } from "@/services/auth/session.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FloatingDemoBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<"umkm" | "creator" | "admin">("umkm");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const role = getMockRole();
    if (role === "creator" || role === "umkm" || role === "admin") {
      setCurrentRole(role);
    }
  }, [pathname]);

  if (!mounted) return null;

  const handleSwitchRole = (role: "umkm" | "creator") => {
    setMockRole(role);
    setCurrentRole(role);
    const targetUrl = role === "umkm" ? "/dashboard/umkm" : "/dashboard/kreator";
    // window.location.assign memastikan reload context dan state bersih
    window.location.assign(targetUrl);
  };

  const handleConfirmReset = () => {
    resetDemoStore();
    setIsResetConfirmOpen(false);
    toast.success("Data demo pameran berhasil di-reset ke kondisi awal.");
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  if (isCollapsed) {
    return (
      <aside aria-label="Booth Demo Controller" className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-2 bg-neutral-900/90 hover:bg-neutral-900 text-white rounded-full shadow-2xl border border-neutral-700/80 backdrop-blur-md text-xs font-bold transition-all hover:scale-105 active:scale-95"
          title="Buka Menu Demo Booth"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Demo Booth</span>
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside aria-label="Booth Demo Controller" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[94vw] animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-2 sm:gap-2.5 px-3.5 py-2 rounded-full bg-neutral-900/90 text-white shadow-2xl border border-neutral-700/70 backdrop-blur-md text-xs">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 pl-1 pr-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-neutral-300 hidden md:inline">
              Offline Booth Mode
            </span>
          </div>

          <div className="h-3.5 w-px bg-neutral-700/80 shrink-0" />

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-1 bg-neutral-800/80 p-0.5 rounded-full border border-neutral-700/50">
            <button
              type="button"
              onClick={() => handleSwitchRole("umkm")}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1",
                currentRole === "umkm"
                  ? "bg-primary text-white shadow-xs"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-700/50"
              )}
            >
              <span>🏪</span>
              <span>UMKM</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchRole("creator")}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1",
                currentRole === "creator"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-700/50"
              )}
            >
              <span>🎨</span>
              <span>Kreator</span>
            </button>
          </div>

          <div className="h-3.5 w-px bg-neutral-700/80 shrink-0" />

          {/* Reset Demo State Button */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-950/60 border border-rose-800/50 rounded-full transition-all shrink-0 active:scale-95"
            title="Reset data demo pameran ke kondisi default"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Reset Data</span>
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition shrink-0 ml-0.5"
            title="Sembunyikan Menu"
          >
            ✕
          </button>
        </div>
      </aside>

      {/* Confirmation Modal for Reset */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm p-6 bg-white border shadow-2xl rounded-2xl border-border-soft space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 border border-rose-100">
              <span className="text-xl">🔄</span>
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-text-primary">
                Reset Seluruh Data Demo Pameran?
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Tindakan ini akan mengembalikan seluruh campaign yang baru dibuat, pekerjaan yang diklaim, dan status negosiasi kembali ke seed awal pameran.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 h-10 text-xs font-semibold text-text-secondary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 h-10 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-xl shadow-xs transition"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
