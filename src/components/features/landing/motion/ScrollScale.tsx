"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

interface ScrollScaleProps {
  children: ReactNode;
  className?: string;
  from?: number;
  to?: number;
  // "enter" scales while the block comes into view, "leave" while it scrolls out of the top.
  phase?: "enter" | "leave";
}

export function ScrollScale({ children, className, from = 0.9, to = 1, phase = "enter" }: ScrollScaleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const range = phase === "enter" ? { start: "top bottom", end: "top 35%" } : { start: "top top", end: "bottom top" };
        gsap.fromTo(
          el,
          { scale: from },
          { scale: to, ease: "none", scrollTrigger: { trigger: el, ...range, scrub: 1 } },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
