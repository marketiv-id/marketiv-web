"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { EASE_OUT, gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";

type RevealMode = "words" | "lines" | "fade" | "clip";

interface RevealProps {
  as?: ElementType;
  id?: string;
  className?: string;
  children: ReactNode;
  // "words" rises a heading word by word behind a line mask, "lines" does the same per line,
  // "fade" lifts a block, "clip" wipes a block open from the bottom.
  mode?: RevealMode;
  delay?: number;
  start?: string;
}

export function Reveal({ as: Tag = "div", id, className, children, mode = "fade", delay = 0, start = "top 85%" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const scrollTrigger = { trigger: el, start, once: true };
        if (mode === "fade") {
          gsap.from(el, { y: 36, autoAlpha: 0, duration: 1.1, ease: EASE_OUT, delay, scrollTrigger });
          return;
        }
        if (mode === "clip") {
          gsap.fromTo(
            el,
            { clipPath: "inset(100% 0% 0% 0%)", y: 48 },
            { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.3, ease: EASE_OUT, delay, scrollTrigger, clearProps: "clipPath" },
          );
          return;
        }
        const split = SplitText.create(el, {
          type: mode === "words" ? "words,lines" : "lines",
          mask: "lines",
          aria: "auto",
          autoSplit: true,
          onSplit: (self) => {
            const tl = gsap.timeline({ delay, scrollTrigger });
            // A small tilt from the baseline gives the rise some weight without turning into a bounce.
            tl.from(mode === "words" ? self.words : self.lines, {
              yPercent: 115,
              rotate: mode === "words" ? 4 : 0,
              transformOrigin: "0% 100%",
              duration: 1.05,
              ease: EASE_OUT,
              stagger: mode === "words" ? 0.04 : 0.1,
            });
            // Highlighted phrases get their box wiped in after the words land; SplitText slices the box per line.
            const boxes = Array.from(el.querySelectorAll<HTMLElement>(".hl-box"));
            if (boxes.length) {
              const ink = getComputedStyle(el).color;
              const fill = getComputedStyle(boxes[0]).color;
              tl.fromTo(
                boxes,
                { "--hl-w": "0%", color: ink },
                { "--hl-w": "100%", color: fill, duration: 0.8, ease: "power3.inOut", stagger: 0.08 },
                "-=0.6",
              );
            }
            return tl;
          },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
