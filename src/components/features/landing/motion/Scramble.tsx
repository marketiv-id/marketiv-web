"use client";

import { useRef, type ElementType } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { whenIntroDone } from "./intro-state";

interface ScrambleProps {
  text: string;
  as?: ElementType;
  className?: string;
  chars?: string;
  duration?: number;
  delay?: number;
  // Start once the intro curtain is gone instead of waiting for the element to scroll into view.
  immediate?: boolean;
}

export function Scramble({ text, as: Tag = "span", className, chars = "0123456789", duration = 1.2, delay = 0, immediate = false }: ScrambleProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const vars = { duration, delay, ease: "none", scrambleText: { text, chars, speed: 0.5, revealDelay: duration * 0.35 } };
        if (!immediate) {
          gsap.to(el, { ...vars, scrollTrigger: { trigger: el, start: "top 90%", once: true } });
          return;
        }
        let tween: gsap.core.Tween | null = null;
        const stop = whenIntroDone(() => {
          tween = gsap.to(el, vars);
        });
        return () => {
          stop();
          tween?.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [text] },
  );

  // The final text is already in the server HTML; the scramble only runs once and ends on the same text.
  return (
    <Tag ref={ref} className={className}>
      {text}
    </Tag>
  );
}
