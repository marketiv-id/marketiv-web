"use client";

import { useRef, type ElementType } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
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
        const vars = { duration, delay, ease: "none", scrambleText: { text, chars, speed: 0.5, revealDelay: duration * 0.35, delimiter: " " } };
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

  // The final text is in the server HTML twice: once for screen readers, once invisible to fix the box height.
  // The scrambled copy sits on top, so random characters can never widen or grow the card while they run.
  return (
    <Tag className={cn("relative", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="invisible block">
        {text}
      </span>
      <span ref={ref} aria-hidden="true" className="absolute inset-0 block overflow-hidden [overflow-wrap:anywhere]">
        {text}
      </span>
    </Tag>
  );
}
