"use client";

import { useRef, type ReactNode } from "react";
import { FINE_POINTER, gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  max?: number;
}

export function TiltCard({ children, className, max = 6 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(FINE_POINTER, () => {
        const onMove = (event: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width - 0.5;
          const py = (event.clientY - rect.top) / rect.height - 0.5;
          gsap.to(el, { rotateY: px * max * 2, rotateX: -py * max * 2, transformPerspective: 900, duration: 0.6, ease: "power3.out" });
        };
        const onLeave = () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.9, ease: "expo.out" });
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("[transform-style:preserve-3d]", className)}>
      {children}
    </div>
  );
}
