"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { resetDemoStore } from "@/lib/demo/demo-store";
import { getMockRole, setMockRole } from "@/services/auth/session.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FloatingDemoBar() {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<"umkm" | "creator" | "admin">("umkm");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [isBottomHovered, setIsBottomHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  const lastScrollY = useRef(0);

  useEffect(() => {
    setMounted(true);
    const role = getMockRole();
    if (role === "creator" || role === "umkm" || role === "admin") {
      setCurrentRole(role);
    }
  }, [pathname]);

  // Keyboard shortcut: Alt+D / Option+D toggles demo bar visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-hide on scroll: hides when scrolling down > 15px, reappears on scroll up or top
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      if (currentScrollY < 30) {
        setIsScrolledDown(false);
      } else if (delta > 15) {
        setIsScrolledDown(true);
      } else if (delta < -10) {
        setIsScrolledDown(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return null;

  const handleSwitchRole = (role: "umkm" | "creator") => {
    setMockRole(role);
    setCurrentRole(role);
    const targetUrl = role === "umkm" ? "/dashboard/umkm" : "/dashboard/kreator";
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

  // Minimized state: ultra-discreet trigger in corner with shortcut support
  if (isCollapsed) {
    return (
      <aside
        aria-label="Booth Demo Controller"
        className="fixed bottom-3 left-3 z-50 animate-in fade-in duration-200"
      >
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900/40 hover:bg-neutral-900/90 text-neutral-300 hover:text-white rounded-full shadow-lg border border-neutral-700/40 hover:border-neutral-600 backdrop-blur-md text-[11px] font-medium transition-all opacity-40 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
          title="Buka Demo Booth (Alt+D)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[10px] tracking-tight">Demo Booth</span>
        </button>
      </aside>
    );
  }

  const shouldSlideDown = isScrolledDown && !isBottomHovered;

  return (
    <>
      {/* Invisible bottom hover detection zone to recall bar effortlessly */}
      <div
        className="fixed bottom-0 left-0 right-0 h-6 z-40 pointer-events-auto"
        onMouseEnter={() => setIsBottomHovered(true)}
        onMouseLeave={() => setIsBottomHovered(false)}
        aria-hidden="true"
      />

      <aside
        aria-label="Booth Demo Controller"
        onMouseEnter={() => setIsBottomHovered(true)}
        onMouseLeave={() => setIsBottomHovered(false)}
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[94vw] transition-all duration-300 ease-out",
          shouldSlideDown
            ? "translate-y-24 opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100 pointer-events-auto"
        )}
      >
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
                "px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
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
                "px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
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
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-950/60 border border-rose-800/50 rounded-full transition-all shrink-0 active:scale-95 cursor-pointer"
            title="Reset data demo pameran ke kondisi default"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Reset Data</span>
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition shrink-0 ml-0.5 cursor-pointer"
            title="Sembunyikan Menu (Alt+D)"
            aria-label="Sembunyikan Menu"
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
                className="flex-1 h-10 text-xs font-semibold text-text-secondary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 h-10 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-xl shadow-xs transition cursor-pointer"
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
