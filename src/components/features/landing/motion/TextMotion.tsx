"use client";

import { EASE_OUT, gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";

const LABEL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Hidden at this breakpoint (display: none somewhere up the tree), so there are no lines to measure.
const isRendered = (el: HTMLElement) => el.getClientRects().length > 0;

// Page-wide text accents for server-rendered markup, opted in by attribute so sections stay server components:
// [data-scramble] mono labels decode once as they enter, [data-lines] paragraphs rise line by line.
// Each plays once; reduced motion leaves the text exactly as rendered.
export function TextMotion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, (context) => {
      let cancelled = false;
      const splits: SplitText[] = [];

      gsap.utils.toArray<HTMLElement>("[data-scramble]").forEach((el) => {
        const text = el.textContent ?? "";
        gsap.to(el, {
          duration: 0.9,
          ease: "none",
          scrambleText: { text, chars: LABEL_CHARS, speed: 0.6, revealDelay: 0.15 },
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });

      // Split once, after the web fonts settle, instead of autoSplit: re-splitting rebuilt the tween and its
      // ScrollTrigger mid-flight, which threw for paragraphs hidden at the current breakpoint.
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      // context.add keeps these late tweens inside the matchMedia context, so they revert with it.
      fontsReady.then(() => {
        if (cancelled) return;
        context.add(() => gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((el) => {
          if (!isRendered(el)) return;
          const split = SplitText.create(el, { type: "lines", mask: "lines", aria: "auto" });
          splits.push(split);
          if (!split.lines.length) return;
          gsap.from(split.lines, {
            yPercent: 105,
            autoAlpha: 0,
            duration: 0.95,
            ease: EASE_OUT,
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        }));
      });

      return () => {
        cancelled = true;
        splits.forEach((split) => split.revert());
      };
    });
    return () => mm.revert();
  });

  return null;
}
