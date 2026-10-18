"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface StickyStackProps {
  children: ReactNode;
  className?: string;
}

// Children marked [data-stack-panel] stick with CSS; GSAP only shrinks and dims the panel being covered.
export function StickyStack({ children, className }: StickyStackProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const panels = gsap.utils.toArray<HTMLElement>("[data-stack-panel]", el);

      // A panel taller than the viewport sticks by its bottom edge, so its lower content is read before the next panel covers it.
      // Without a top value sticky never engages, which is the plain stacked layout used for reduced motion and no-JS.
      const placePanels = () => {
        const stick = window.matchMedia(MOTION_OK).matches;
        panels.forEach((panel) => {
          panel.style.top = stick ? `${Math.min(0, window.innerHeight - panel.offsetHeight)}px` : "";
        });
      };
      placePanels();
      const observer = new ResizeObserver(() => {
        placePanels();
        ScrollTrigger.refresh();
      });
      panels.forEach((panel) => observer.observe(panel));
      window.addEventListener("resize", placePanels);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
        panels.slice(0, -1).forEach((panel, index) => {
          const next = panels[index + 1];
          const inner = panel.querySelector<HTMLElement>("[data-stack-inner]") ?? panel;
          const shade = panel.querySelector<HTMLElement>("[data-stack-shade]");
          const tl = gsap.timeline({
            scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: 1 },
          });
          tl.to(inner, { scale: 0.94, ease: "none", force3D: true }, 0);
          if (shade) tl.to(shade, { opacity: 0.35, ease: "none" }, 0);
        });
      });
      mm.add(MOTION_OK, () => {
        panels.forEach((panel) => {
          const items = panel.querySelectorAll("[data-stack-item]");
          if (!items.length) return;
          gsap.from(items, {
            y: 28,
            autoAlpha: 0,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.08,
            scrollTrigger: { trigger: panel, start: "top 70%", once: true },
          });
        });
      });

      return () => {
        observer.disconnect();
        window.removeEventListener("resize", placePanels);
        mm.revert();
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("relative", className)}>
      {children}
    </div>
  );
}
