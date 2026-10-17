"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

interface FooterWordmarkProps {
  text: string;
}

export function FooterWordmark({ text }: FooterWordmarkProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(el.querySelectorAll("[data-letter]"), {
          yPercent: 100,
          ease: "expo.out",
          duration: 1.2,
          stagger: 0.04,
          scrollTrigger: { trigger: el, start: "top 95%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} aria-hidden="true" className="mb-8 mt-16 overflow-hidden select-none md:mt-24">
      <div className="flex justify-between text-[clamp(4rem,19.5vw,19rem)] font-extrabold leading-[0.8] tracking-[-0.06em] text-white">
        {text.split("").map((letter, index) => (
          <span key={`${letter}-${index}`} data-letter className={index >= text.length - 2 ? "inline-block text-primary-500" : "inline-block"}>
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}
