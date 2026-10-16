"use client";

import { useEffect, useRef } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";

let curtain: HTMLDivElement | null = null;

// Covers the screen before a route change; resolves once covered so the caller can navigate.
export function playPageCurtain(): Promise<void> {
  if (!curtain || !window.matchMedia(MOTION_OK).matches) return Promise.resolve();
  const el = curtain;
  return new Promise((resolve) => {
    gsap.killTweensOf(el);
    gsap.set(el, { visibility: "visible" });
    gsap.fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: "expo.inOut", onComplete: resolve });
  });
}

export function PageCurtain() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    curtain = ref.current;
    // Coming back through the history cache must not land on a covered page.
    const reset = () => {
      if (ref.current) gsap.set(ref.current, { yPercent: 100, visibility: "hidden" });
    };
    reset();
    window.addEventListener("pageshow", reset);
    return () => {
      window.removeEventListener("pageshow", reset);
      curtain = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none invisible fixed inset-0 z-[95] translate-y-full bg-primary-500"
    />
  );
}
