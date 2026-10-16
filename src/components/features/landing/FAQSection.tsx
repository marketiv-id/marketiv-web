"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { FaqContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";

interface FAQSectionProps {
  content: FaqContent;
}

// Desktop: questions on the left act as vertical tabs for one answer panel. Mobile: every answer is shown in place, no toggling.
export function FAQSection({ content }: FAQSectionProps) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = content.items[active];

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = content.items.length - 1;
    let next = index;
    if (event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      id="faq"
      data-section-label={content.label}
      aria-labelledby="faq-title"
      className="relative z-[4] -mt-10 rounded-b-[24px] bg-neutral-25 px-5 pb-28 pt-32 md:rounded-b-[40px] md:px-10 md:pb-36 md:pt-40"
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal as="h2" id="faq-title" mode="words" className="text-display-lg max-w-[16ch] text-secondary-900">
          {content.title}
        </Reveal>

        <dl className="mt-12 grid gap-8 lg:hidden">
          {content.items.map((item) => (
            <div key={item.q}>
              <dt className="text-[18px] font-bold leading-snug text-secondary-900">{item.q}</dt>
              <dd className="mt-2 text-[16px] leading-relaxed text-neutral-700">{item.a}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 hidden gap-10 lg:grid lg:grid-cols-12">
          <div role="tablist" aria-orientation="vertical" aria-label={content.title} className="flex flex-col gap-1 lg:col-span-5">
            {content.items.map((item, index) => {
              const selected = index === active;
              return (
                <button
                  key={item.q}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  id={`${baseId}-tab-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(index)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  className={cn(
                    "rounded-2xl px-5 py-4 text-left text-[17px] font-semibold leading-snug transition-[background-color,color] duration-200",
                    selected ? "bg-secondary-900 text-white" : "text-secondary-900 hover:bg-neutral-100",
                  )}
                >
                  {item.q}
                </button>
              );
            })}
          </div>

          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${active}`}
            className="lg:col-span-6 lg:col-start-7"
          >
            <div key={active} className="sticky top-28 animate-[landing-label-in_0.5s_cubic-bezier(0.16,1,0.3,1)] rounded-3xl bg-white p-9">
              <p className="text-[22px] font-extrabold leading-snug tracking-[-0.02em] text-secondary-900 [text-wrap:balance]">{current.q}</p>
              <p className="mt-5 text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty]">{current.a}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
