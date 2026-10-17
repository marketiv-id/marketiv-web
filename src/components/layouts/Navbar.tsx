"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { NAVBAR_CONTENT } from "@/data/content";
import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardByRole, isUserPortalRole } from "@/lib/constants/routes";
import { ScrollTrigger } from "@/lib/gsap";

const content = NAVBAR_CONTENT;

function RollLabel({ text }: { text: string }) {
  return (
    <span className="roll">
      <span>{text}</span>
      <span aria-hidden="true">{text}</span>
    </span>
  );
}

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileCta, setShowMobileCta] = useState(false);
  const { user, loading } = useAuth();
  const dashboardHref = user && isUserPortalRole(user.role) ? dashboardByRole[user.role] : null;
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Hides while reading downward and returns on any upward scroll, so the bar never covers content for long.
  // ScrollTrigger batches with the page's other scroll work instead of adding a raw scroll listener.
  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const y = self.scroll();
        setIsScrolled(y > 24);
        setShowMobileCta(y > window.innerHeight * 0.7);
        setIsHidden(self.direction === 1 && y > 160);
      },
    });
    return () => trigger.kill();
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);
  const navHidden = isHidden && !isMenuOpen;

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:px-6 md:pt-6",
          navHidden && "-translate-y-[130%]",
        )}
      >
        <nav
          aria-label={content.mainLabel}
          className={cn(
            "relative mx-auto flex max-w-[1180px] items-center gap-2 rounded-full bg-white py-2 pl-5 pr-2 ring-1 ring-secondary-900/[0.06] transition-shadow duration-300 md:gap-3",
            isScrolled || isMenuOpen ? "shadow-[0_12px_32px_rgba(16,32,51,0.12)]" : "shadow-[0_4px_18px_rgba(16,32,51,0.06)]",
          )}
        >
          <Link href="/" aria-label={content.homeLabel} className="mr-2 inline-flex shrink-0 items-center">
            <Image src="/brand/marketiv-logo.webp" alt="Marketiv" width={545} height={96} priority className="h-7 w-auto md:h-8" />
          </Link>

          <ul className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {content.menu.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="roll-host inline-flex h-10 items-center rounded-full px-3.5 text-[14px] font-semibold text-secondary-800 transition-colors hover:text-primary-600"
                >
                  <RollLabel text={link.label} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex-1 lg:hidden" />

          <button
            ref={toggleRef}
            type="button"
            aria-label={isMenuOpen ? content.closeMenuLabel : content.openMenuLabel}
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="roll-host inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13px] font-bold text-secondary-900 transition-colors hover:bg-neutral-100 lg:hidden"
          >
            <span aria-hidden="true" className="relative block h-2.5 w-4">
              <span className={cn("absolute left-0 top-0 h-[1.5px] w-full bg-current transition-transform duration-300", isMenuOpen && "translate-y-[4.5px] rotate-45")} />
              <span className={cn("absolute bottom-0 left-0 h-[1.5px] w-full bg-current transition-transform duration-300", isMenuOpen && "-translate-y-[4.5px] -rotate-45")} />
            </span>
            <span className="hidden sm:inline-flex">
              <RollLabel text={isMenuOpen ? content.closeLabel : content.menuLabel} />
            </span>
          </button>

          <DesktopAuthActions loading={loading} dashboardHref={dashboardHref} />

          <div
            ref={panelRef}
            id={menuId}
            inert={!isMenuOpen}
            className={cn(
              "absolute right-0 top-[calc(100%+10px)] w-full origin-top-right rounded-[28px] bg-white p-3 shadow-[0_24px_60px_rgba(16,32,51,0.14)] ring-1 ring-secondary-900/5 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:w-[360px] lg:hidden",
              isMenuOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
            )}
          >
            <ul className="flex flex-col">
              {content.menu.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    className="roll-host flex items-center justify-between rounded-2xl px-4 py-3.5 text-lg font-bold tracking-[-0.02em] text-secondary-900 transition-colors hover:bg-neutral-100"
                  >
                    <RollLabel text={link.label} />
                  </Link>
                </li>
              ))}
            </ul>
            <MobileAuthActions loading={loading} dashboardHref={dashboardHref} onNavigate={closeMenu} />
          </div>
        </nav>
      </div>

      {!loading && !dashboardHref && (
        <div
          className={cn(
            "fixed bottom-6 left-3 right-[92px] z-40 grid grid-cols-2 gap-2 rounded-full bg-secondary-900/95 p-1.5 shadow-[0_18px_40px_rgba(16,32,51,0.28)] backdrop-blur transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden",
            showMobileCta ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[150%] opacity-0",
          )}
          inert={!showMobileCta}
        >
          <Link href="/register" className="flex h-11 items-center justify-center rounded-full bg-primary-500 text-[14px] font-bold text-white transition-[scale] duration-150 active:scale-[0.96]">
            {content.register}
          </Link>
          <Link href="/login" className="flex h-11 items-center justify-center rounded-full bg-white/10 text-[14px] font-bold text-white transition-[scale] duration-150 active:scale-[0.96]">
            {content.login}
          </Link>
        </div>
      )}
    </>
  );
}

function DesktopAuthActions({ loading, dashboardHref }: { loading: boolean; dashboardHref: string | null }) {
  if (loading) {
    return <div aria-hidden="true" className="hidden h-10 w-40 rounded-full bg-neutral-200/60 md:block" />;
  }
  if (dashboardHref) {
    return (
      <Link
        href={dashboardHref}
        id="navbar-dashboard"
        className="roll-host hidden h-10 items-center rounded-full bg-secondary-900 px-5 text-[13px] font-bold text-white transition-colors hover:bg-primary-600 md:inline-flex"
      >
        <RollLabel text={content.dashboard} />
      </Link>
    );
  }
  return (
    <div className="hidden items-center gap-1 md:flex">
      <Link
        href="/login"
        id="navbar-login"
        className="roll-host inline-flex h-10 items-center rounded-full px-4 text-[13px] font-bold text-secondary-900 transition-colors hover:bg-neutral-100"
      >
        <RollLabel text={content.login} />
      </Link>
      <Link
        href="/register"
        id="navbar-register"
        className="roll-host inline-flex h-10 items-center gap-2 rounded-full bg-secondary-900 px-5 text-[13px] font-bold text-white transition-colors hover:bg-primary-500"
      >
        <RollLabel text={content.register} />
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h11m-4-5 5 5-5 5" />
        </svg>
      </Link>
    </div>
  );
}

function MobileAuthActions({
  loading,
  dashboardHref,
  onNavigate,
}: {
  loading: boolean;
  dashboardHref: string | null;
  onNavigate: () => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-neutral-200 pt-3 md:hidden">
      {loading ? (
        <div aria-hidden="true" className="h-12 w-full rounded-full bg-neutral-100" />
      ) : dashboardHref ? (
        <Link
          href={dashboardHref}
          id="navbar-dashboard-mobile"
          onClick={onNavigate}
          className="flex h-12 w-full items-center justify-center rounded-full bg-secondary-900 text-sm font-bold text-white"
        >
          {content.dashboard}
        </Link>
      ) : (
        <>
          <Link
            href="/login"
            onClick={onNavigate}
            className="flex h-12 w-full items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-secondary-900"
          >
            {content.login}
          </Link>
          <Link
            href="/register"
            onClick={onNavigate}
            className="flex h-12 w-full items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white"
          >
            {content.registerMobile}
          </Link>
        </>
      )}
    </div>
  );
}
