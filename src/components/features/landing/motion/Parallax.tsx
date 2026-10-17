"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MOBILE_MOTION, DESKTOP_MOTION, useGSAP } from "@/lib/gsap";

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  // Percent of the element's own height it travels across the viewport; negative moves against the scroll.
  speed?: number;
}

export function Parallax({ children, className, speed = 12 }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      const build = (amount: number) => {
        gsap.fromTo(
          el,
          { yPercent: -amount },
          {
            yPercent: amount,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 },
          },
        );
      };
      mm.add(DESKTOP_MOTION, () => build(speed));
      // Mobile keeps half the travel so text beside the layer stays easy to read.
      mm.add(MOBILE_MOTION, () => build(speed / 2));
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
