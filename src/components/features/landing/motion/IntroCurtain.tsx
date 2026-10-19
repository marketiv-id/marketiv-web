"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { markIntroDone, resetIntroState } from "./intro-state";
import { jumpToTop, setScrollLocked } from "./SmoothScroll";

// The logo wipes in on paper (CSS, from the first paint), then flies into the navbar's own logo slot while the
// paper fades, so the loader hands off to the page as one motion. Kept short: no waiting for the full load event.
const MIN_MS = 1000;
const MAX_MS = 1600;
const SAFETY_MS = 5000;
const NAV_LOGO = 'nav a[aria-label="Marketiv, ke beranda"] img';

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

// Plays on every hard load when motion is allowed; the inline head script decides that before first paint.
export function IntroCurtain() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const html = document.documentElement;
      resetIntroState();
      if (!el || html.getAttribute("data-intro") !== "play") {
        markIntroDone();
        return;
      }

      // A refresh would otherwise restore the old scroll position behind the overlay and skip the hero entrance.
      // The old hash goes too, so the address bar matches the hero the visitor lands on.
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
      if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      jumpToTop();
      setScrollLocked(true);

      let ended = false;
      let cancelled = false;
      const end = () => {
        if (ended) return;
        ended = true;
        html.removeAttribute("data-intro");
        setScrollLocked(false);
      };
      const safety = window.setTimeout(() => {
        markIntroDone();
        end();
      }, SAFETY_MS);

      const q = gsap.utils.selector(el);
      // Time already spent before hydration counts toward the minimum, so a slow bundle does not add a second wait.
      const elapsed = performance.now();
      const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
      const ready = Promise.race([Promise.all([fonts, delay(Math.max(0, MIN_MS - elapsed))]), delay(Math.max(0, MAX_MS - elapsed))]);

      ready.then(() => {
        if (cancelled) return;
        // A late restore or anchor jump can still move the page under the overlay; the logo must fly to a visible navbar.
        jumpToTop();
        // Measure every trigger and pin while the paper still covers the page; doing it after the handoff made
        // one long task land on the first frames of the hero entrance.
        ScrollTrigger.refresh();
        requestAnimationFrame(() => {
          if (!cancelled) play();
        });
      });

      const play = () => {
        const logo = q("[data-intro-logo]")[0] as HTMLElement | undefined;
        const target = document.querySelector<HTMLElement>(NAV_LOGO);
        const tl = gsap.timeline({
          defaults: { ease: "expo.inOut" },
          onComplete: () => {
            window.clearTimeout(safety);
            end();
          },
        });
        tl.to(q("[data-intro-meta]"), { autoAlpha: 0, y: 12, duration: 0.35, ease: "power2.in" }, 0);

        const from = logo?.getBoundingClientRect();
        const to = target?.getBoundingClientRect();
        if (logo && from && to && to.width > 0) {
          // FLIP: move the centred logo onto the navbar logo's box, measured centre to centre.
          const scale = to.width / from.width;
          const dx = to.left + to.width / 2 - (from.left + from.width / 2);
          const dy = to.top + to.height / 2 - (from.top + from.height / 2);
          tl.to(logo, { x: dx, y: dy, scale, duration: 0.95 }, 0.15);
        } else if (logo) {
          tl.to(logo, { autoAlpha: 0, scale: 0.9, duration: 0.5 }, 0.15);
        }
        tl.to(q("[data-intro-paper]"), { autoAlpha: 0, duration: 0.6, ease: "power2.out" }, 0.55)
          // The hero starts while the paper is still fading, so the handoff reads as one motion.
          .call(markIntroDone, [], 0.6)
          .set(logo ?? {}, { autoAlpha: 0 });
      };

      return () => {
        cancelled = true;
        window.clearTimeout(safety);
        setScrollLocked(false);
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} aria-hidden="true" className="intro-curtain pointer-events-none fixed inset-0 z-[90]">
      <div data-intro-paper className="halftone absolute inset-0 bg-white [--ht-dir:200deg] [--ht-dot:rgba(249,115,22,0.16)] [--ht-size:12px]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <div data-intro-logo className="origin-center will-change-transform">
          <div className="intro-wipe">
            <Image src="/brand/marketiv-logo.webp" alt="" width={545} height={96} priority className="h-[clamp(44px,7vw,84px)] w-auto" />
          </div>
        </div>
        <div data-intro-meta className="mt-7 flex flex-col items-center">
          <p className="text-caption-mono intro-rise-soft text-neutral-600">Kolaborasi hebat, bisnis melesat</p>
          <span className="mt-4 block h-[2px] w-[min(46vw,260px)] overflow-hidden rounded-full bg-secondary-900/10">
            <span className="intro-line block h-full w-full origin-left rounded-full bg-primary-500" />
          </span>
        </div>
      </div>
    </div>
  );
}
