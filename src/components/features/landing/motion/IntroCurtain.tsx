"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { markIntroDone, resetIntroState } from "./intro-state";
import { setScrollLocked } from "./SmoothScroll";

// Greets the visitor, cycling through who they might be, then lands on the brand name (same pattern as the owner's portfolio).
const GREETING = "HALO,";
const LOADING_WORDS = ["pemilik UMKM", "kreator lokal", "penjual kuliner", "brand fashion"];
const FINAL_WORD = "ini Marketiv.";
const CHARS = "abcdefghijklmnopqrstuvwxyz";
// The loading phase lasts at least this long so the word cycle reads as intentional, and never longer than the cap.
const MIN_LOADING_MS = 1800;
const MAX_LOADING_MS = 3600;
const SAFETY_MS = 9000;

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

// Resolves once fonts, images, and the hydration burst have settled, so the curtain moves on a quiet main thread.
function pageSettled() {
  const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
  const loaded =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
  const idle = new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => resolve(), { timeout: 1200 });
    else window.setTimeout(resolve, 300);
  });
  return Promise.race([Promise.all([fonts, loaded, idle, delay(MIN_LOADING_MS)]), delay(MAX_LOADING_MS)]);
}

// Plays on every load when motion is allowed; the inline head script decides that before first paint.
export function IntroCurtain() {
  const ref = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

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
        // Layout settled while the overlay was up (fonts, images), so trigger positions are measured again.
        ScrollTrigger.refresh();
      };
      const safety = window.setTimeout(() => {
        markIntroDone();
        end();
      }, SAFETY_MS);

      const q = gsap.utils.selector(el);
      const word = q("[data-intro-word]");
      const progress = { value: 0 };
      const renderCount = () => {
        if (counter.current) counter.current.textContent = String(Math.round(progress.value)).padStart(3, "0");
      };

      // The greeting already rose in CSS before hydration; here the word cycles and the counter creeps toward 90.
      const counting = gsap.to(progress, { value: 90, duration: MAX_LOADING_MS / 1000, ease: "power2.out", onUpdate: renderCount });
      const cycle = gsap.timeline({ repeat: -1, delay: 0.4 });
      [...LOADING_WORDS.slice(1), LOADING_WORDS[0]].forEach((text) => {
        cycle.to(word, { duration: 0.45, ease: "none", scrambleText: { text, chars: CHARS, speed: 0.7 } }).to({}, { duration: 0.2 });
      });

      const finish = () => {
        if (cancelled) return;
        counting.kill();
        cycle.kill();
        gsap
          .timeline({
            defaults: { ease: "expo.inOut" },
            onComplete: () => {
              window.clearTimeout(safety);
              end();
            },
          })
          .to(progress, { value: 100, duration: 0.45, ease: "power2.out", onUpdate: renderCount }, 0)
          .to(word, { duration: 0.6, ease: "none", scrambleText: { text: FINAL_WORD, chars: CHARS, speed: 0.7 } }, 0)
          .addLabel("wipe", 0.7)
          // y: 0 clears the px offset GSAP parses from the inline translateY, so only yPercent moves the curtain.
          .fromTo(q("[data-curtain]"), { y: 0, yPercent: 130 }, { yPercent: 0, duration: 1 }, "wipe")
          .fromTo(q("[data-curtain-lip]"), { scaleY: 1 }, { scaleY: 0, duration: 1 }, "wipe")
          .addLabel("lift", "wipe+=0.8")
          .to(q("[data-intro-text]"), { yPercent: -40, autoAlpha: 0, duration: 0.7, ease: "power3.in" }, "lift")
          .to(el, { yPercent: -100, duration: 1 }, "lift")
          .fromTo(q("[data-exit-lip]"), { scaleY: 1 }, { scaleY: 0, duration: 1 }, "lift")
          // The hero starts while the overlay is still lifting, so the handoff reads as one motion.
          .call(markIntroDone, [], "lift+=0.3");
      };
      pageSettled().then(finish);

      // Cleanup only releases what this run holds, so a Strict Mode remount replays the intro cleanly.
      return () => {
        cancelled = true;
        counting.kill();
        cycle.kill();
        window.clearTimeout(safety);
        setScrollLocked(false);
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} aria-hidden="true" className="intro-curtain fixed inset-y-0 left-0 z-[90] w-screen">
      <div className="absolute inset-0 bg-white" />
      {/* Inline transform, not a translate utility: Tailwind v4 writes the separate translate property, which would stack with GSAP's transform. */}
      <div data-curtain className="absolute inset-0 bg-primary-500 will-change-transform" style={{ transform: "translateY(130%)" }}>
        <div data-curtain-lip className="absolute -top-[14vh] left-[-15%] h-[28vh] w-[130%] origin-bottom rounded-[50%] bg-primary-500" />
      </div>
      {/* Hangs below the overlay as a half ellipse, so it only shows as a trailing curve once the overlay lifts. */}
      <div data-exit-lip className="absolute left-[-15%] top-full h-[14vh] w-[130%] origin-top rounded-b-[50%_100%] bg-primary-500" />

      <div data-intro-text className="relative z-10 flex h-full flex-col items-center justify-center text-secondary-900">
        {/* The greeting and labels animate in CSS, so text is on screen from the first paint, before JavaScript runs. */}
        <p className="font-display-cond flex overflow-hidden pb-[0.06em] text-[30vw] leading-[0.86] md:text-[17vw]">
          {GREETING.split("").map((char, index) => (
            <span key={`${char}-${index}`} className="intro-char inline-block" style={{ animationDelay: `${0.1 + index * 0.06}s` }}>
              {char}
            </span>
          ))}
        </p>
        <p className="intro-fade mt-[1.5vw] h-[1.2em] text-[8vw] font-semibold italic tracking-[-0.03em] text-primary-600 md:text-[3.6vw]" style={{ animationDelay: "0.45s" }}>
          <span data-intro-word>{LOADING_WORDS[0]}</span>
        </p>
        <div className="text-caption-mono intro-fade absolute inset-x-5 bottom-6 flex justify-between text-neutral-600 md:inset-x-10 md:bottom-8" style={{ animationDelay: "0.6s" }}>
          <span>UMKM × Kreator</span>
          <span ref={counter} className="[font-variant-numeric:tabular-nums]">000</span>
          <span>Indonesia</span>
        </div>
      </div>
    </div>
  );
}
