"use client";

import { EASE_OUT, gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";

const LABEL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Page-wide text accents for server-rendered markup, opted in by attribute so sections stay server components:
// [data-scramble] mono labels decode once as they enter, [data-lines] paragraphs rise line by line.
// Each plays once; reduced motion leaves the text exactly as rendered.
export function TextMotion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
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

      gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((el) => {
        splits.push(
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            aria: "auto",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 105,
                autoAlpha: 0,
                duration: 0.95,
                ease: EASE_OUT,
                stagger: 0.08,
                scrollTrigger: { trigger: el, start: "top 88%", once: true },
              }),
          }),
        );
      });

      return () => splits.forEach((split) => split.revert());
    });
    return () => mm.revert();
  });

  return null;
}
