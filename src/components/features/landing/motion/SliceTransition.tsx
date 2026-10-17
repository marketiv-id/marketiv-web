"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { jumpToHash } from "./SmoothScroll";

const SLICES = 5;

// The covered jump replaces the native anchor jump, which would also have moved focus; without this, keyboard and
// screen-reader users stay on the link they pressed while the page has moved on.
function focusTarget(hash: string) {
  const el = document.querySelector<HTMLElement>(hash);
  if (!el) return;
  if (!el.hasAttribute("tabindex") && el.tabIndex < 0) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

export function SliceTransition() {
  const ref = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const bars = gsap.utils.toArray<HTMLElement>("[data-slice]", el);
        let busy = false;

        const run = (hash: string, label: string) => {
          if (busy) return;
          busy = true;
          if (labelRef.current) labelRef.current.textContent = label;
          gsap.set(el, { display: "block" });
          gsap
            .timeline({
              defaults: { ease: "power4.inOut" },
              onComplete: () => {
                gsap.set(el, { display: "none" });
                busy = false;
              },
            })
            .fromTo(bars, { yPercent: 101 }, { yPercent: 0, duration: 0.5, stagger: 0.045 })
            .fromTo(labelRef.current, { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: "expo.out" }, "-=0.22")
            // The jump happens while the screen is covered, then triggers catch up before the slices leave.
            .add(() => {
              jumpToHash(hash);
              focusTarget(hash);
              window.history.replaceState(null, "", hash);
              ScrollTrigger.update();
            })
            .to(labelRef.current, { yPercent: -110, duration: 0.35, ease: "expo.in" }, "+=0.12")
            .to(bars, { yPercent: -101, duration: 0.55, stagger: 0.045 }, "-=0.08");
        };

        // Only links that opt in with data-transition-label (the navbar) get the slices; other anchors keep the smooth scroll.
        // Capture phase, so this runs before SmoothScroll's bubbling handler, which then sees the click as handled.
        const onClick = (event: MouseEvent) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const anchor = (event.target as Element | null)?.closest?.<HTMLAnchorElement>("a[data-transition-label]");
          if (!anchor) return;
          const url = new URL(anchor.href, window.location.href);
          if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
          if (!document.querySelector(url.hash)) return;
          event.preventDefault();
          run(url.hash, anchor.dataset.transitionLabel ?? "");
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} aria-hidden="true" className="fixed inset-y-0 left-0 z-[85] hidden w-screen">
      <div className="flex h-full">
        {Array.from({ length: SLICES }, (_, index) => (
          <span key={index} data-slice className="h-full flex-1 bg-primary-500" style={{ marginLeft: index ? -1 : 0 }} />
        ))}
      </div>
      <span className="absolute inset-0 flex items-center justify-center px-5">
        {/* The label rises through its own line mask while the slices hold. */}
        <span className="block overflow-hidden pb-[0.04em]">
          <span ref={labelRef} className="font-display-cond block text-center text-[17vw] leading-[0.86] text-secondary-900 md:text-[10vw]" />
        </span>
      </span>
    </div>
  );
}
