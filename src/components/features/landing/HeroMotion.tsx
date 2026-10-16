"use client";

import { useRef, type ReactNode } from "react";
import { EASE_OUT, FINE_POINTER, gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";
import { whenIntroDone } from "./motion/intro-state";

interface HeroMotionProps {
  children: ReactNode;
  className?: string;
}

// Animates the server-rendered hero through data attributes, so the markup and copy stay in the server component.
export function HeroMotion({ children, className }: HeroMotionProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const q = gsap.utils.selector(root);
      // Text only animates when the intro curtain hid the first paint; otherwise the headline stays put for a fast, stable first view.
      const curtainPlayed = document.documentElement.getAttribute("data-intro") === "play";
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        gsap.set(q("[data-hero-chip]"), { autoAlpha: 0, scale: 0.8, y: 24 });
        gsap.set(q("[data-hero-phone]"), { autoAlpha: 0, y: 90, rotate: -4 });
        gsap.set(q("[data-hero-word]"), { autoAlpha: 0, yPercent: 30 });
        let split: SplitText | null = null;
        if (curtainPlayed) {
          split = SplitText.create(q("[data-hero-title]"), { type: "words,lines", mask: "lines", aria: "auto" });
          gsap.set(split.words, { yPercent: 115 });
          gsap.set(q("[data-hero-fade]"), { autoAlpha: 0, y: 24 });
        }

        let intro: gsap.core.Timeline | null = null;
        const stop = whenIntroDone(() => {
          intro = gsap.timeline({ defaults: { ease: EASE_OUT } });
          intro
            .to(q("[data-hero-word]"), { autoAlpha: 1, yPercent: 0, duration: 1.4 }, 0)
            .to(q("[data-hero-phone]"), { autoAlpha: 1, y: 0, rotate: -4, duration: 1.3 }, 0.1)
            .to(q("[data-hero-chip]"), { autoAlpha: 1, scale: 1, y: 0, duration: 1, stagger: 0.08 }, 0.45);
          if (split) intro.to(split.words, { yPercent: 0, duration: 1.1, stagger: 0.035 }, 0.15);
          if (curtainPlayed) intro.to(q("[data-hero-fade]"), { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 0.55);
        });

        // Scrolling out: the frame shrinks and rounds, the backdrop word lags behind the phone.
        const out = gsap.timeline({
          scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 1 },
        });
        out
          .to(q("[data-hero-frame]"), { scale: 0.92, borderRadius: 64, ease: "none" }, 0)
          .to(q("[data-hero-word-layer]"), { yPercent: 40, ease: "none" }, 0)
          .to(q("[data-hero-phone-layer]"), { yPercent: -18, ease: "none" }, 0);

        return () => {
          stop();
          intro?.kill();
          split?.revert();
        };
      });

      // Three depth layers follow the pointer at different strengths.
      mm.add(FINE_POINTER, () => {
        const layers = q("[data-depth]").map((layer) => ({
          depth: Number((layer as HTMLElement).dataset.depth ?? 0),
          x: gsap.quickTo(layer, "x", { duration: 1, ease: "power3.out" }),
          y: gsap.quickTo(layer, "y", { duration: 1, ease: "power3.out" }),
        }));
        const onMove = (event: PointerEvent) => {
          const rect = root.getBoundingClientRect();
          const nx = (event.clientX - rect.left) / rect.width - 0.5;
          const ny = (event.clientY - rect.top) / rect.height - 0.5;
          layers.forEach((layer) => {
            layer.x(nx * layer.depth * 2);
            layer.y(ny * layer.depth * 2);
          });
        };
        const onLeave = () => layers.forEach((layer) => {
          layer.x(0);
          layer.y(0);
        });
        root.addEventListener("pointermove", onMove);
        root.addEventListener("pointerleave", onLeave);
        return () => {
          root.removeEventListener("pointermove", onMove);
          root.removeEventListener("pointerleave", onLeave);
        };
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="beranda" data-section-label="Beranda" className={className}>
      {children}
    </section>
  );
}
