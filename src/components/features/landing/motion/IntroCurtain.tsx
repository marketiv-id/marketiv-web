"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { markIntroDone, resetIntroState } from "./intro-state";
import { setScrollLocked } from "./SmoothScroll";

const WORD = "marketiv";
// Short on purpose: the wordmark and the progress line finish in CSS by ~0.9s, then the screen splits open.
// The page never waits for the full load event; fonts are the only thing worth holding for, and only briefly.
const MIN_MS = 900;
const MAX_MS = 1500;
const SAFETY_MS = 5000;

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

// Plays on every load when motion is allowed; the inline head script decides that before first paint.
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
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      setScrollLocked(true);

      let ended = false;
      let cancelled = false;
      const end = () => {
        if (ended) return;
        ended = true;
        html.removeAttribute("data-intro");
        setScrollLocked(false);
        ScrollTrigger.refresh();
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
        gsap
          .timeline({
            defaults: { ease: "expo.inOut" },
            onComplete: () => {
              window.clearTimeout(safety);
              end();
            },
          })
          .to(q("[data-intro-content]"), { yPercent: -60, autoAlpha: 0, duration: 0.45, ease: "power3.in" }, 0)
          .to(q("[data-intro-half='top']"), { yPercent: -100, duration: 0.8 }, 0.2)
          .to(q("[data-intro-half='bottom']"), { yPercent: 100, duration: 0.8 }, 0.2)
          // The hero starts while the halves are still opening, so the handoff reads as one motion.
          .call(markIntroDone, [], 0.4);
      });

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
      <div data-intro-half="top" className="absolute inset-x-0 top-0 h-[50.5%] bg-secondary-900" />
      <div data-intro-half="bottom" className="absolute inset-x-0 bottom-0 h-[50.5%] bg-secondary-900" />

      <div data-intro-content className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Letters and line animate in CSS from the first paint, before JavaScript runs. */}
        <p className="flex overflow-hidden pb-[0.08em] text-[clamp(3.5rem,13vw,10rem)] font-extrabold leading-[0.9] tracking-[-0.06em] text-white">
          {WORD.split("").map((char, index) => (
            <span
              key={`${char}-${index}`}
              className={index >= WORD.length - 2 ? "intro-char inline-block text-primary-500" : "intro-char inline-block"}
              style={{ animationDelay: `${0.05 + index * 0.04}s` }}
            >
              {char}
            </span>
          ))}
        </p>
        <span className="mt-6 block h-[3px] w-[min(56vw,420px)] overflow-hidden rounded-full bg-white/10">
          <span className="intro-line block h-full w-full origin-left rounded-full bg-primary-500" />
        </span>
      </div>
    </div>
  );
}
