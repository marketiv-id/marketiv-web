"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type MouseEvent, type PointerEvent } from "react";
import { FINE_POINTER, gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { playPageCurtain } from "./PageCurtain";

type LandingButtonVariant = "primary" | "dark" | "light" | "outline" | "outline-light";
type LandingButtonSize = "md" | "lg";

interface LandingButtonProps {
  href: string;
  children: string;
  variant?: LandingButtonVariant;
  size?: LandingButtonSize;
  // Plays the full-screen curtain before navigating to another route.
  curtain?: boolean;
  arrow?: boolean;
  id?: string;
  className?: string;
  cursorLabel?: string;
  onNavigate?: () => void;
}

const VARIANT_CLASSES: Record<LandingButtonVariant, { base: string; fill: string; fillText: string }> = {
  primary: { base: "bg-primary-500 text-white", fill: "bg-secondary-900", fillText: "group-hover/btn:text-white group-focus-visible/btn:text-white" },
  dark: { base: "bg-secondary-900 text-white", fill: "bg-primary-500", fillText: "group-hover/btn:text-white group-focus-visible/btn:text-white" },
  light: { base: "bg-white text-secondary-900", fill: "bg-primary-500", fillText: "group-hover/btn:text-white group-focus-visible/btn:text-white" },
  outline: { base: "bg-transparent text-secondary-900 ring-1 ring-inset ring-secondary-900/25", fill: "bg-secondary-900", fillText: "group-hover/btn:text-white group-focus-visible/btn:text-white" },
  "outline-light": { base: "bg-white/5 text-white ring-1 ring-inset ring-white/30", fill: "bg-white", fillText: "group-hover/btn:text-secondary-900 group-focus-visible/btn:text-secondary-900" },
};

const SIZE_CLASSES: Record<LandingButtonSize, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-7 text-base",
};

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h11m-4-5 5 5-5 5" />
    </svg>
  );
}

function Label({ text, arrow }: { text: string; arrow: boolean }) {
  return (
    <span className="relative inline-flex items-center gap-2">
      <span className="roll">
        <span>{text}</span>
        <span aria-hidden="true">{text}</span>
      </span>
      {arrow && <Arrow />}
    </span>
  );
}

export function LandingButton({
  href,
  children,
  variant = "primary",
  size = "lg",
  curtain = false,
  arrow = false,
  id,
  className,
  cursorLabel,
  onNavigate,
}: LandingButtonProps) {
  const router = useRouter();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const styles = VARIANT_CLASSES[variant];

  // Magnetic pull only exists for a fine pointer with motion allowed; touch and reduced motion get a plain link.
  useGSAP(
    () => {
      const wrap = wrapRef.current;
      const link = linkRef.current;
      const label = link?.querySelector<HTMLElement>("[data-btn-label]");
      if (!wrap || !link || !label) return;
      const mm = gsap.matchMedia();
      mm.add(FINE_POINTER, () => {
        const onMove = (event: globalThis.PointerEvent) => {
          const rect = wrap.getBoundingClientRect();
          const dx = event.clientX - (rect.left + rect.width / 2);
          const dy = event.clientY - (rect.top + rect.height / 2);
          gsap.to(link, { x: dx * 0.28, y: dy * 0.32, duration: 0.5, ease: "power3.out" });
          gsap.to(label, { x: dx * 0.12, y: dy * 0.12, duration: 0.5, ease: "power3.out" });
        };
        const onLeave = () => gsap.to([link, label], { x: 0, y: 0, duration: 0.7, ease: "expo.out" });
        wrap.addEventListener("pointermove", onMove);
        wrap.addEventListener("pointerleave", onLeave);
        return () => {
          wrap.removeEventListener("pointermove", onMove);
          wrap.removeEventListener("pointerleave", onLeave);
        };
      });
      return () => mm.revert();
    },
    { scope: wrapRef },
  );

  // The fill grows from the point the pointer entered, so set its origin before the CSS transition starts.
  const onPointerEnter = (event: PointerEvent<HTMLAnchorElement>) => {
    const link = event.currentTarget;
    const rect = link.getBoundingClientRect();
    link.style.setProperty("--lx", `${event.clientX - rect.left}px`);
    link.style.setProperty("--ly", `${event.clientY - rect.top}px`);
  };

  const onClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.();
    if (!curtain) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    await playPageCurtain();
    router.push(href);
  };

  return (
    <span ref={wrapRef} className="inline-flex">
      <Link
        ref={linkRef}
        id={id}
        href={href}
        onPointerEnter={onPointerEnter}
        onClick={onClick}
        data-cursor="button"
        data-cursor-label={cursorLabel}
        className={cn(
          "group/btn liquid-btn roll-host relative isolate inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-full font-bold tracking-[-0.01em] outline-none transition-[scale] duration-150 active:scale-[0.96]",
          "focus-visible:ring-4 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          styles.base,
          SIZE_CLASSES[size],
          className,
        )}
      >
        <span aria-hidden="true" className={cn("liquid-fill absolute inset-0 -z-10 rounded-full", styles.fill)} />
        <span data-btn-label className={cn("relative transition-colors duration-300", styles.fillText)}>
          <Label text={children} arrow={arrow} />
        </span>
      </Link>
    </span>
  );
}
