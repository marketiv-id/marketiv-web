"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { PillarsContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";

interface PillarsSectionProps {
  content: PillarsContent;
}

// b2p-style numbered rows. A row is "active" while it crosses the middle of the viewport (or on hover),
// which fills it orange and slides its thumbnail in, so touch visitors get the same reveal as mouse users.
export function PillarsSection({ content }: PillarsSectionProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const rows = gsap.utils.toArray<HTMLElement>("[data-pillar-row]", ref.current);
      const triggers = rows.map((row) =>
        ScrollTrigger.create({
          trigger: row,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (self) => {
            row.dataset.active = self.isActive ? "true" : "false";
          },
        }),
      );
      return () => triggers.forEach((trigger) => trigger.kill());
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      id="solusi"
      aria-labelledby="solusi-title"
      className="relative z-[10] -mt-10 rounded-b-[24px] bg-white px-5 pb-24 pt-32 md:rounded-b-[40px] md:px-10 md:pb-32 md:pt-40"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <Reveal as="h2" id="solusi-title" mode="words" className="font-display-cond text-poster-md max-w-[18ch] text-secondary-900 lg:col-span-8">
            {content.titleLead} <span className="hl-box">{content.titleAccent}</span>
          </Reveal>
          <p data-lines className="max-w-sm text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty] lg:col-span-3 lg:col-start-10">
            {content.intro}
          </p>
        </div>

        <ol className="mt-16 border-b border-secondary-900/10 md:mt-20">
          {content.items.map((item, index) => (
            <li key={item.title} data-pillar-row data-active="false" className="group/row relative border-t border-secondary-900/10">
              <div
                aria-hidden="true"
                className="halftone absolute inset-0 origin-bottom scale-y-0 rounded-[20px] bg-primary-500 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [--ht-dir:20deg] [--ht-size:9px] group-hover/row:scale-y-100 group-data-[active=true]/row:scale-y-100 motion-reduce:transition-none"
              />
              <div className="relative grid gap-3 px-3 py-7 transition-colors duration-300 group-hover/row:text-white group-data-[active=true]/row:text-white md:px-6 md:py-9 lg:grid-cols-12 lg:items-center lg:gap-6">
                <span className="font-mono-nota text-sm text-primary-600 transition-colors duration-300 group-hover/row:text-white/80 group-data-[active=true]/row:text-white/80 lg:col-span-1">
                  0{index + 1}
                </span>
                <h3 data-lines className="font-display-cond text-poster-sm text-secondary-900 transition-colors duration-300 group-hover/row:text-white group-data-[active=true]/row:text-white lg:col-span-6">
                  {item.title}
                </h3>
                <div className="relative hidden aspect-[16/10] overflow-hidden rounded-xl bg-white/20 opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [transform:translateY(16px)_rotate(-3deg)] group-hover/row:opacity-100 group-hover/row:[transform:none] group-data-[active=true]/row:opacity-100 group-data-[active=true]/row:[transform:none] lg:col-span-2 lg:block">
                  <Image src={item.image} alt={item.imageAlt} fill sizes="14vw" className="object-cover object-top" />
                </div>
                <p className="max-w-md text-[16px] leading-relaxed text-neutral-700 transition-colors duration-300 group-hover/row:text-white/90 group-data-[active=true]/row:text-white/90 lg:col-span-3">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
