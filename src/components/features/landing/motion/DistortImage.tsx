"use client";

import Image from "next/image";
import { useId, useRef } from "react";
import { FINE_POINTER, gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface DistortImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  imageClassName?: string;
  cursorLabel?: string;
}

// Liquid hover: an SVG displacement filter is attached only while hovered and removed afterwards, so it never costs a frame at rest.
export function DistortImage({ src, alt, width, height, sizes, className, imageClassName, cursorLabel = "Lihat" }: DistortImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const filterId = `distort-${useId().replace(/:/g, "")}`;

  useGSAP(
    () => {
      const el = ref.current;
      const map = el?.querySelector("feDisplacementMap");
      const noise = el?.querySelector("feTurbulence");
      const media = el?.querySelector<HTMLElement>("[data-distort-media]");
      if (!el || !map || !noise || !media) return;
      const mm = gsap.matchMedia();
      mm.add(FINE_POINTER, () => {
        const onEnter = () => {
          media.style.filter = `url(#${filterId})`;
          gsap.killTweensOf([map, noise]);
          gsap.timeline()
            .to(map, { attr: { scale: 26 }, duration: 0.35, ease: "power2.out" })
            .to(map, { attr: { scale: 0 }, duration: 0.9, ease: "expo.out" });
          gsap.fromTo(noise, { attr: { baseFrequency: "0.012 0.04" } }, { attr: { baseFrequency: "0.004 0.012" }, duration: 1.2, ease: "power2.out" });
          gsap.to(media, { scale: 1.04, duration: 1.2, ease: "expo.out" });
        };
        const onLeave = () => {
          gsap.to(media, {
            scale: 1,
            duration: 0.8,
            ease: "expo.out",
            onComplete: () => {
              media.style.filter = "";
            },
          });
        };
        el.addEventListener("pointerenter", onEnter);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointerenter", onEnter);
          el.removeEventListener("pointerleave", onLeave);
          media.style.filter = "";
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [filterId] },
  );

  return (
    <div ref={ref} data-cursor-label={cursorLabel} className={cn("relative overflow-hidden", className)}>
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.012" numOctaves="1" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div data-distort-media className="h-full w-full will-change-transform">
        <Image src={src} alt={alt} width={width} height={height} sizes={sizes} className={cn("h-full w-full object-cover", imageClassName)} />
      </div>
    </div>
  );
}
