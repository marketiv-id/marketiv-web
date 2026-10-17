"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface MarqueeRowProps {
  items: string[];
  outline?: boolean;
  reverse?: boolean;
  onOrange?: boolean;
}

function MarqueeRow({ items, outline = false, reverse = false, onOrange = false }: MarqueeRowProps) {
  // Two copies of the row so a -50% shift loops seamlessly.
  const copies = [0, 1];
  return (
    <div data-marquee-row data-reverse={reverse ? "true" : "false"} className="flex w-max will-change-transform">
      {copies.map((copy) => (
        <div key={copy} aria-hidden={copy === 1 ? true : undefined} className="flex shrink-0 items-center">
          {items.map((item) => (
            <span key={`${copy}-${item}`} className="flex items-center">
              <span
                className={cn(
                  "font-display-cond px-5 text-[clamp(3.25rem,10vw,9.5rem)] leading-[0.95] md:px-8",
                  outline
                    ? onOrange
                      ? "text-transparent [-webkit-text-stroke:1.5px_var(--color-secondary-900)]"
                      : "text-transparent [-webkit-text-stroke:1.5px_var(--color-primary-500)]"
                    : onOrange
                      ? "text-white"
                      : "text-secondary-900",
                )}
              >
                {item}
              </span>
              <span aria-hidden="true" className={cn("h-3 w-3 shrink-0 rotate-45 md:h-4 md:w-4", onOrange ? "bg-secondary-900" : "bg-primary-500")} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

interface MarqueeProps {
  top: string[];
  bottom: string[];
  className?: string;
  onOrange?: boolean;
}

export function Marquee({ top, bottom, className, onOrange = false }: MarqueeProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const rows = gsap.utils.toArray<HTMLElement>("[data-marquee-row]", el);
        const loops = rows.map((row) => {
          const reverse = row.dataset.reverse === "true";
          const loop = gsap.fromTo(
            row,
            { xPercent: reverse ? -50 : 0 },
            { xPercent: reverse ? 0 : -50, duration: 38, ease: "none", repeat: -1 },
          );
          // Parked far from zero so a negative timeScale (scrolling up) can run backwards without hitting the start.
          loop.totalTime(loop.duration() * 50);
          return loop;
        });
        let hovered = false;
        const base = () => (hovered ? 0.25 : 1);
        // Scroll velocity speeds the loop up, then it eases back to its idle pace.
        const trigger = ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const boost = gsap.utils.clamp(1, 5, 1 + Math.abs(self.getVelocity()) / 400);
            const direction = self.direction === -1 ? -1 : 1;
            loops.forEach((loop) => {
              gsap.to(loop, { timeScale: boost * direction, duration: 0.2, overwrite: true });
              gsap.to(loop, { timeScale: base() * direction, duration: 1.2, delay: 0.2, ease: "power2.out" });
            });
          },
        });
        const enter = () => {
          hovered = true;
          loops.forEach((loop) => gsap.to(loop, { timeScale: 0.25, duration: 0.6 }));
        };
        const leave = () => {
          hovered = false;
          loops.forEach((loop) => gsap.to(loop, { timeScale: 1, duration: 0.6 }));
        };
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointerleave", leave);
        return () => {
          trigger.kill();
          el.removeEventListener("pointerenter", enter);
          el.removeEventListener("pointerleave", leave);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("relative overflow-hidden py-2", className)}>
      <MarqueeRow items={top} onOrange={onOrange} />
      <MarqueeRow items={bottom} outline reverse onOrange={onOrange} />
    </div>
  );
}
