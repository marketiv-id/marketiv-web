"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { LandingTextRun } from "@/types/landing";

interface ScrollHighlightProps {
  runs: LandingTextRun[];
  className?: string;
}

// Words are split at render time (not with SplitText) so the server HTML already carries the final markup.
function toWords(text: string) {
  return text.split(/(\s+)/).filter((part) => part.length > 0);
}

export function ScrollHighlight({ runs, className }: ScrollHighlightProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const words = el.querySelectorAll<HTMLElement>("[data-hl-word]");
        const marks = el.querySelectorAll<HTMLElement>("[data-hl-mark]");
        gsap.set(marks, { "--hl-size": "0%" });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 42%", scrub: 0.8 },
        });
        tl.fromTo(words, { opacity: 0.16 }, { opacity: 1, ease: "none", stagger: 0.08 }, 0);
        marks.forEach((mark) => {
          const firstWord = mark.querySelector("[data-hl-word]");
          const index = Array.prototype.indexOf.call(words, firstWord);
          tl.to(mark, { "--hl-size": "100%", ease: "none", duration: 0.6 }, Math.max(0, index) * 0.08 + 0.2);
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <p ref={ref} className={className}>
      {runs.map((run, runIndex) => {
        const words = toWords(run.text).map((part, partIndex) =>
          /^\s+$/.test(part) ? (
            part
          ) : (
            // Inline (not inline-block) so punctuation from the next run never wraps away from its word.
            <span key={partIndex} data-hl-word>
              {part}
            </span>
          ),
        );
        return run.mark ? (
          <span key={runIndex} data-hl-mark className={cn("hl-mark")}>
            {words}
          </span>
        ) : (
          <span key={runIndex}>{words}</span>
        );
      })}
    </p>
  );
}
