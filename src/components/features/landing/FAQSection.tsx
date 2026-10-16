"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { FaqContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";

interface FAQSectionProps {
  content: FaqContent;
}

export function FAQSection({ content }: FAQSectionProps) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section
      id="faq"
      data-section-label={content.label}
      aria-labelledby="faq-title"
      className="relative z-[4] -mt-10 rounded-b-[24px] bg-neutral-25 px-5 pb-28 pt-36 md:rounded-b-[40px] md:px-10 md:pb-36 md:pt-48"
    >
      <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="font-mono-nota text-xs uppercase tracking-[0.12em] text-primary-700">{content.label}</p>
          <Reveal as="h2" id="faq-title" mode="words" className="text-display-md mt-5 max-w-sm text-secondary-900">
            {content.title}
          </Reveal>
        </div>

        <div className="lg:col-span-8">
          <ul className="border-t border-secondary-900/15">
            {content.items.map((item, index) => {
              const isOpen = open === index;
              const buttonId = `${baseId}-q-${index}`;
              const panelId = `${baseId}-a-${index}`;
              return (
                <li key={item.q} className="border-b border-secondary-900/15">
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : index)}
                      className="roll-host group flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <span className="flex items-baseline gap-4">
                        <span className="font-mono-nota text-xs text-neutral-500">{String(index + 1).padStart(2, "0")}</span>
                        <span className="text-lg font-bold tracking-[-0.01em] text-secondary-900 transition-colors group-hover:text-primary-600 md:text-xl">
                          {item.q}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-secondary-900/15 transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          isOpen ? "rotate-45 bg-primary-500 text-white ring-primary-500" : "bg-white text-secondary-900",
                        )}
                      >
                        <span className="absolute h-[1.5px] w-3.5 bg-current" />
                        <span className="absolute h-3.5 w-[1.5px] bg-current" />
                      </span>
                    </button>
                  </h3>
                  <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} className="faq-panel">
                    <div>
                      <p className="max-w-2xl pb-7 pl-9 text-[16px] leading-relaxed text-neutral-700">{item.a}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
