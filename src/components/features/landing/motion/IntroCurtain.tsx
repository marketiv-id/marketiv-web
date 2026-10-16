"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { INTRO_STORAGE_KEY, markIntroDone, resetIntroState } from "./intro-state";
import { setScrollLocked } from "./SmoothScroll";

export function IntroCurtain() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const root = document.documentElement;
      resetIntroState();
      if (!el || root.getAttribute("data-intro") !== "play") {
        markIntroDone();
        return;
      }

      setScrollLocked(true);
      const finish = () => {
        root.removeAttribute("data-intro");
        setScrollLocked(false);
        try {
          window.sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
        } catch {
          // Private mode can block storage; the curtain then simply plays again next visit.
        }
      };

      const tl = gsap.timeline({ onComplete: finish });
      tl.from("[data-intro-mark]", { yPercent: 120, duration: 0.55, ease: "expo.out" })
        .to("[data-intro-mark]", { yPercent: -120, duration: 0.4, ease: "expo.in" }, "+=0.15")
        .to("[data-intro-panel='front']", { yPercent: -100, duration: 0.7, ease: "expo.inOut" }, "-=0.1")
        .to("[data-intro-panel='back']", { yPercent: -100, duration: 0.7, ease: "expo.inOut" }, "-=0.55")
        // The hero starts while the last panel is still leaving, so the handoff reads as one motion.
        .add(() => markIntroDone(), "-=0.45");

      return () => {
        tl.kill();
        finish();
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} aria-hidden="true" className="intro-curtain pointer-events-none fixed inset-0 z-[90] animate-[intro-failsafe_0s_linear_3s_forwards]">
      <div data-intro-panel="back" className="absolute inset-0 bg-primary-500" />
      <div data-intro-panel="front" className="absolute inset-0 flex items-center justify-center bg-secondary-900">
        <div className="overflow-hidden py-2">
          <div data-intro-mark className="flex items-center gap-3">
            <Image src="/brand/marketiv-mark.webp" alt="" width={56} height={32} className="h-8 w-auto" priority />
            <span className="text-2xl font-extrabold tracking-[-0.04em] text-neutral-25">marketiv</span>
          </div>
        </div>
      </div>
    </div>
  );
}
