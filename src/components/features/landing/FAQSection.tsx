"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { FaqContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";

interface FAQSectionProps {
  content: FaqContent;
}

// Ruled accordion rows. Closed answers stay in the DOM (collapsed with grid rows and made inert) so they remain indexable.
export function FAQSection({ content }: FAQSectionProps) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="relative z-[3] -mt-10 rounded-b-[24px] bg-neutral-100 px-5 pb-28 pt-32 md:rounded-b-[40px] md:px-10 md:pb-36 md:pt-40"
    >
      <div className="mx-auto grid max-w-[1600px] gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p data-scramble className="text-caption-mono text-primary-600">{content.label}</p>
            <Reveal as="h2" id="faq-title" mode="words" className="font-display-cond text-poster-sm mt-5 max-w-[12ch] text-secondary-900">
              {content.title}
            </Reveal>
            <div data-cursor-tone="ink" className="halftone relative mt-10 hidden overflow-hidden rounded-[24px] bg-primary-500 p-7 text-white [--ht-dot:rgba(255,255,255,0.3)] lg:block">
              <p className="font-display-cond text-4xl leading-none">{content.contactTitle}</p>
              <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/90">{content.contactText}</p>
              <a
                href={`mailto:${content.contactEmail}`}
                className="mt-6 inline-flex h-11 items-center rounded-full bg-secondary-900 px-5 text-sm font-bold text-white transition-[background-color,scale] duration-200 hover:bg-white hover:text-secondary-900 active:scale-[0.96]"
              >
                {content.contactEmail}
              </a>
            </div>
          </div>
        </div>

        <ol className="border-b border-secondary-900/10 lg:col-span-8">
          {content.items.map((item, index) => {
            const expanded = open === index;
            const buttonId = `${baseId}-q-${index}`;
            const panelId = `${baseId}-a-${index}`;
            return (
              <li key={item.q} className="border-t border-secondary-900/10">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpen(expanded ? null : index)}
                    className="group/faq grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 py-6 text-left md:grid-cols-[3.5rem_1fr_auto] md:py-7"
                  >
                    <span className="font-mono-nota text-sm text-primary-600 [font-variant-numeric:tabular-nums]">0{index + 1}</span>
                    <span className="text-[clamp(1.15rem,1.7vw,1.6rem)] font-bold leading-snug tracking-[-0.02em] text-secondary-900 transition-colors group-hover/faq:text-primary-600">
                      {item.q}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative mt-1 flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-inset transition-[background-color,transform,box-shadow] duration-300",
                        expanded ? "rotate-45 bg-secondary-900 text-white ring-secondary-900" : "text-secondary-900 ring-secondary-900/20",
                      )}
                    >
                      <span className="absolute h-[1.5px] w-3.5 bg-current" />
                      <span className="absolute h-3.5 w-[1.5px] bg-current" />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  inert={!expanded}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pb-7 pl-[2.75rem] text-[16px] leading-relaxed text-neutral-700 [text-wrap:pretty] md:pl-[4.25rem] md:text-[17px]">{item.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div data-cursor-tone="ink" className="halftone relative overflow-hidden rounded-[24px] bg-primary-500 p-7 text-white [--ht-dot:rgba(255,255,255,0.3)] lg:hidden">
          <p className="font-display-cond text-4xl leading-none">{content.contactTitle}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/90">{content.contactText}</p>
          <a href={`mailto:${content.contactEmail}`} className="mt-6 inline-flex h-11 items-center rounded-full bg-secondary-900 px-5 text-sm font-bold text-white active:scale-[0.96]">
            {content.contactEmail}
          </a>
        </div>
      </div>
    </section>
  );
}
