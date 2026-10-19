"use client";

import { useRef, type ReactNode } from "react";
import { gsap, PIN_MOTION, useGSAP } from "@/lib/gsap";
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
      mm.add(PIN_MOTION, () => {
        // Measured from the last panel's edge plus the track's end padding: scrollWidth leaves that padding out,
        // which released the pin while the last panel was still partly off screen.
        const distance = () => {
          const last = track.lastElementChild as HTMLElement | null;
          if (!last) return 0;
          const endPadding = parseFloat(getComputedStyle(track).paddingRight) || 0;
          return Math.max(0, last.offsetLeft + last.offsetWidth + endPadding - el.clientWidth);
        };
        // A short hold after the last panel lands, so it can be read before the page scrolls on.
        const hold = () => window.innerHeight * 0.35;
        // Slide, then hold: durations are in px so the slide maps 1:1 to scroll and the hold is pure pinned time.
        const tween = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${distance() + hold()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        // force3D keeps the track on its own layer between scrub updates, so resuming never re-rasterises the panels.
        tween.to(track, { x: () => -distance(), duration: distance(), force3D: true }).to({}, { duration: hold() });

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
            scrollTrigger: { trigger: el, start: "top top", end: () => `+=${distance() + hold()}`, scrub: true, invalidateOnRefresh: true },
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
      {/* In flow, not absolute: on a short screen an absolute bar would sit on top of the panel captions. */}
      <div aria-hidden="true" className="mx-8 mt-8 hidden h-px shrink-0 bg-secondary-900/15 lg:block">
        <div data-track-progress className="h-full origin-left scale-x-0 bg-primary-500" />
      </div>
    </div>
  );
}
