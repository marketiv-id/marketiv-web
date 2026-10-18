"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface MascotFloatProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  // Offsets the idle loop so two mascots side by side never bob in sync.
  phase?: number;
}

// A slow idle bob plus a pop-up entrance; the hover lift lives in CSS on a wrapper so it never fights the GSAP loop.
export function MascotFloat({ src, alt, width, height, sizes, className, phase = 0 }: MascotFloatProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(el, {
          yPercent: 28,
          rotate: phase ? 6 : -6,
          autoAlpha: 0,
          duration: 1.1,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
        const idle = gsap.to(el, { y: -10, rotate: phase ? -1.5 : 1.5, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: phase, paused: true });
        // The idle loop only runs while the mascot is on screen.
        const visible = ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (self) => (self.isActive ? idle.play() : idle.pause()) });
        return () => {
          visible.kill();
          idle.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div className={cn("pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]", className)}>
      <div ref={ref}>
        <Image src={src} alt={alt} width={width} height={height} sizes={sizes} className="h-auto w-full select-none" />
      </div>
    </div>
  );
}
