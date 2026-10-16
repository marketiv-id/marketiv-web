"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { NAVBAR_CONTENT } from "@/data/content";
import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardByRole, isUserPortalRole } from "@/lib/constants/routes";
import { SECTION_EVENT } from "@/components/features/landing/motion/SectionObserver";

const content = NAVBAR_CONTENT;

function RollLabel({ text }: { text: string }) {
  return (
    <span className="roll">
      <span>{text}</span>
      <span aria-hidden="true">{text}</span>
    </span>
  );
}

function LocalClock({ city }: { city: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const format = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const update = () => setTime(format.format(new Date()));
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="font-mono-nota text-[11px] uppercase tracking-[0.08em] text-neutral-600">
      {city} <span className="text-secondary-900">{time ?? "--.--"}</span> WIB
    </span>
  );
}

function SectionIndicator() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const onSection = (event: Event) => setLabel((event as CustomEvent<string>).detail);
    window.addEventListener(SECTION_EVENT, onSection);
    return () => window.removeEventListener(SECTION_EVENT, onSection);
  }, []);

  if (!label) return null;
  return (
    <span aria-hidden="true" className="relative hidden h-4 overflow-hidden xl:inline-block">
      <span key={label} className="block animate-[landing-label-in_0.5s_cubic-bezier(0.16,1,0.3,1)] font-mono-nota text-[11px] uppercase tracking-[0.08em] text-primary-700">
        {label}
      </span>
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
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        setIsScrolled(y > 24);
        setShowMobileCta(y > window.innerHeight * 0.7);
        if (Math.abs(y - lastY) > 6) setIsHidden(y > lastY && y > 160);
        lastY = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
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
            "relative mx-auto flex max-w-[1400px] items-center gap-2 rounded-full py-2 pl-4 pr-2 transition-[background-color,box-shadow] duration-300 md:gap-3",
            isScrolled || isMenuOpen
              ? "bg-white/90 shadow-[0_10px_30px_rgba(16,32,51,0.08)] ring-1 ring-secondary-900/5 backdrop-blur-xl"
              : "bg-white/70 ring-1 ring-white/60 backdrop-blur-md",
          )}
        >
          <Link href="/" aria-label={content.homeLabel} className="mr-1 inline-flex shrink-0 items-center">
            <Image src="/brand/marketiv-logo.webp" alt="Marketiv" width={545} height={96} priority className="h-7 w-auto md:h-8" />
          </Link>

          <div className="hidden items-center gap-1.5 md:flex">
            <Link
              href={content.audienceUmkm.href}
              className="roll-host inline-flex h-9 items-center rounded-full bg-primary-50 px-4 text-[13px] font-bold text-primary-700 ring-1 ring-inset ring-primary-200 transition-colors hover:bg-primary-100"
            >
              <RollLabel text={content.audienceUmkm.label} />
            </Link>
            <Link
              href={content.audienceKreator.href}
              className="roll-host inline-flex h-9 items-center rounded-full bg-secondary-50 px-4 text-[13px] font-bold text-secondary-800 ring-1 ring-inset ring-secondary-200 transition-colors hover:bg-secondary-100"
            >
              <RollLabel text={content.audienceKreator.label} />
            </Link>
          </div>

          <div className="ml-2 hidden flex-1 items-center gap-4 lg:flex">
            <SectionIndicator />
          </div>
          <div className="flex-1 lg:hidden" />

          <div className="hidden xl:block">
            <LocalClock city={content.clockCity} />
          </div>

          <button
            ref={toggleRef}
            type="button"
            aria-label={isMenuOpen ? content.closeMenuLabel : content.openMenuLabel}
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="roll-host inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13px] font-bold text-secondary-900 transition-colors hover:bg-neutral-100"
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
              "absolute right-0 top-[calc(100%+10px)] w-full origin-top-right rounded-[28px] bg-white p-3 shadow-[0_24px_60px_rgba(16,32,51,0.14)] ring-1 ring-secondary-900/5 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:w-[360px]",
              isMenuOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
            )}
          >
            <ul className="flex flex-col">
              {content.menu.map((link, index) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    className="roll-host flex items-center justify-between rounded-2xl px-4 py-3.5 text-lg font-bold tracking-[-0.02em] text-secondary-900 transition-colors hover:bg-neutral-100"
                  >
                    <RollLabel text={link.label} />
                    <span className="font-mono-nota text-xs text-neutral-500">0{index + 1}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-neutral-200 pt-3 md:hidden">
              <Link
                href={content.audienceUmkm.href}
                onClick={closeMenu}
                className="flex h-11 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700 ring-1 ring-inset ring-primary-200"
              >
                {content.audienceUmkm.label}
              </Link>
              <Link
                href={content.audienceKreator.href}
                onClick={closeMenu}
                className="flex h-11 items-center justify-center rounded-full bg-secondary-50 text-sm font-bold text-secondary-800 ring-1 ring-inset ring-secondary-200"
              >
                {content.audienceKreator.label}
              </Link>
            </div>
            <MobileAuthActions loading={loading} dashboardHref={dashboardHref} onNavigate={closeMenu} />
          </div>
        </nav>
      </div>

      {!loading && !dashboardHref && (
        <div
          className={cn(
            "fixed bottom-6 left-3 right-[92px] z-40 grid grid-cols-2 gap-2 rounded-full bg-secondary-900/95 p-1.5 shadow-[0_18px_40px_rgba(16,32,51,0.28)] backdrop-blur transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden",
            showMobileCta ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[150%] opacity-0",
          )}
          inert={!showMobileCta}
        >
          <Link href={content.mobileCtaUmkm.href} className="flex h-11 items-center justify-center rounded-full bg-primary-500 text-[13px] font-bold text-white">
            {content.mobileCtaUmkm.label}
          </Link>
          <Link href={content.mobileCtaKreator.href} className="flex h-11 items-center justify-center rounded-full bg-white/10 text-[13px] font-bold text-white">
            {content.mobileCtaKreator.label}
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
        className="roll-host inline-flex h-10 items-center rounded-full bg-primary-500 px-5 text-[13px] font-bold text-white transition-colors hover:bg-secondary-900"
      >
        <RollLabel text={content.register} />
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
