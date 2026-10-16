"use client";

import { useRef, type ReactNode } from "react";
import { DESKTOP_MOTION, gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface HorizontalTrackProps {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
}

// Desktop pins the section and maps vertical scroll to a horizontal track; smaller screens swipe a native scroll-snap row instead.
export function HorizontalTrack({ children, className, trackClassName }: HorizontalTrackProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const track = el?.querySelector<HTMLElement>("[data-track]");
      if (!el || !track) return;
      const mm = gsap.matchMedia();
      mm.add(DESKTOP_MOTION, () => {
        const distance = () => Math.max(0, track.scrollWidth - el.clientWidth);
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // Panels after the first wipe open as they slide in, timed against the horizontal tween.
        gsap.utils.toArray<HTMLElement>("[data-track-media]", track).forEach((media, index) => {
          if (index === 0) return;
          gsap.fromTo(
            media,
            { clipPath: "inset(0% 0% 0% 100%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              ease: "none",
              scrollTrigger: { trigger: media, containerAnimation: tween, start: "left 95%", end: "left 45%", scrub: true },
            },
          );
        });

        const bar = el.querySelector<HTMLElement>("[data-track-progress]");
        if (bar) {
          gsap.fromTo(bar, { scaleX: 0 }, {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top top", end: () => `+=${distance()}`, scrub: true, invalidateOnRefresh: true },
          });
        }
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <div
        data-track
        className={cn(
          "flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-6 [scrollbar-width:none] md:px-8 lg:snap-none lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden",
          trackClassName,
        )}
      >
        {children}
      </div>
      <div aria-hidden="true" className="absolute inset-x-8 bottom-8 hidden h-px bg-secondary-900/15 lg:block">
        <div data-track-progress className="h-full origin-left scale-x-0 bg-primary-500" />
      </div>
    </div>
  );
}
