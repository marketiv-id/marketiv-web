"use client";

import { useRef } from "react";
import { FINE_POINTER, gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface SpotlightProps {
  className?: string;
}

// An orange glow that drifts toward the pointer inside a dark section; it rests in the centre on touch and reduced motion.
export function Spotlight({ className }: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const glow = ref.current;
      const section = glow?.parentElement;
      if (!glow || !section) return;
      const mm = gsap.matchMedia();
      mm.add(FINE_POINTER, () => {
        const moveX = gsap.quickTo(glow, "x", { duration: 1.2, ease: "power3.out" });
        const moveY = gsap.quickTo(glow, "y", { duration: 1.2, ease: "power3.out" });
        const onMove = (event: PointerEvent) => {
          const rect = section.getBoundingClientRect();
          moveX(event.clientX - rect.left - rect.width / 2);
          moveY(event.clientY - rect.top - rect.height / 2);
        };
        const onLeave = () => {
          moveX(0);
          moveY(0);
        };
        section.addEventListener("pointermove", onMove);
        section.addEventListener("pointerleave", onLeave);
        return () => {
          section.removeEventListener("pointermove", onMove);
          section.removeEventListener("pointerleave", onLeave);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full",
        "bg-[radial-gradient(circle,rgba(249,115,22,0.42)_0%,rgba(249,115,22,0.16)_35%,rgba(249,115,22,0)_68%)]",
        className,
      )}
    />
  );
}
