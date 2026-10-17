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
        // The strip holds two copies of its cells, so a half-length shift loops without a seam.
        const loops = q("[data-hero-strip-track]").map((track) => {
          const axis = (track as HTMLElement).dataset.heroStripTrack === "x" ? "xPercent" : "yPercent";
          return gsap.fromTo(track, { [axis]: 0 }, { [axis]: -50, duration: axis === "xPercent" ? 36 : 48, ease: "none", repeat: -1 });
        });

        let split: SplitText | null = null;
        const boxes = q("[data-hero-title] .hl-box");
        if (curtainPlayed) {
          split = SplitText.create(q("[data-hero-title]"), { type: "words,lines", mask: "lines", aria: "auto" });
          gsap.set(split.words, { yPercent: 115 });
          gsap.set(q("[data-hero-fade]"), { autoAlpha: 0, y: 24 });
          gsap.set(q("[data-hero-strip], [data-hero-strip-mobile]"), { autoAlpha: 0, yPercent: 18 });
          gsap.set(q("[data-hero-title] .hl-box"), { "--hl-w": "0%", color: "#102033" });
        }
        const metaItems = q("[data-hero-meta] li");
        const metaText = metaItems.map((item) => item.textContent ?? "");

        let intro: gsap.core.Timeline | null = null;
        const stop = whenIntroDone(() => {
          if (!curtainPlayed) return;
          intro = gsap.timeline({ defaults: { ease: EASE_OUT } });
          intro
            .to(q("[data-hero-strip], [data-hero-strip-mobile]"), { autoAlpha: 1, yPercent: 0, duration: 1.6 }, 0)
            .to(split?.words ?? [], { yPercent: 0, duration: 1.1, stagger: 0.03 }, 0.1)
            // Re-query: SplitText slices the box per line, so the original span is no longer the one on screen.
            .to(q("[data-hero-title] .hl-box"), { "--hl-w": "100%", color: "#ffffff", duration: 0.9, ease: "power3.inOut", stagger: 0.08 }, 0.75)
            .to(q("[data-hero-fade]"), { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 0.55);
          // The meta row decodes like a ticker once it is visible.
          metaItems.forEach((item, index) => {
            intro?.to(item, { duration: 0.8, ease: "none", scrambleText: { text: metaText[index], chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", speed: 0.6 } }, 0.6 + index * 0.1);
          });
        });

        // Scrolling out: the strip keeps travelling faster than the type, which drifts up and fades.
        const out = gsap.timeline({
          scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 1 },
        });
        out
          .to(q("[data-hero-strip-scroll]"), { yPercent: -22, ease: "none" }, 0)
          .to(q("[data-hero-title]"), { yPercent: -12, ease: "none" }, 0);

        return () => {
          stop();
          intro?.kill();
          loops.forEach((loop) => loop.kill());
          split?.revert();
          gsap.set(boxes, { clearProps: "all" });
        };
      });

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
    <section ref={ref} id="beranda" className={className}>
      {children}
    </section>
  );
}
