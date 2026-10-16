"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface ScreenSliceProps {
  // Background of the section above, so the strips read as that surface peeling away.
  colorClassName?: string;
  slices?: number;
}

// Strips start collapsed in the server HTML; only the motion branch raises them, so no-JS and reduced motion never hide content.
export function ScreenSlice({ colorClassName = "bg-neutral-25", slices = 6 }: ScreenSliceProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const section = el?.parentElement;
      if (!el || !section) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const strips = gsap.utils.toArray<HTMLElement>("[data-slice]", el);
        const count = window.innerWidth < 768 ? 4 : strips.length;
        strips.forEach((strip, index) => strip.classList.toggle("hidden", index >= count));
        gsap.fromTo(
          strips.slice(0, count),
          { scaleY: 1 },
          {
            scaleY: 0,
            ease: "none",
            stagger: { each: 0.08, from: "edges" },
            scrollTrigger: { trigger: section, start: "top 98%", end: "top 55%", scrub: 0.6 },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[3] flex h-[16vh] md:h-[22vh]">
      {Array.from({ length: slices }, (_, index) => (
        <div key={index} data-slice className={cn("h-full flex-1 origin-top scale-y-0", colorClassName)} />
      ))}
    </div>
  );
}
