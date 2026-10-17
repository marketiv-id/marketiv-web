import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ModePanel, ModesContent } from "@/types/landing";
import { Parallax } from "./motion/Parallax";
import { Reveal } from "./motion/Reveal";
import { StickyStack } from "./motion/StickyStack";

interface ModesSectionProps {
  content: ModesContent;
}

// Roveia-style stacked cards: each mode is a full-height flat colour card with a halftone corner,
// numbered steps as ruled rows, the rules as chips, and the mode name set as a poster word.
function ModePanelView({ panel, index }: { panel: ModePanel; index: number }) {
  const onOrange = panel.tone === "umkm";
  return (
    <article
      id={`mode-${panel.id}`}
      data-stack-panel
      aria-labelledby={`mode-${panel.id}-title`}
      className={cn(
        "halftone sticky z-[1] flex min-h-dvh flex-col overflow-hidden rounded-[24px] px-5 pb-10 pt-24 text-white md:rounded-[40px] md:px-10 md:pb-12 md:pt-28",
        onOrange ? "bg-primary-500 [--ht-dot:rgba(255,255,255,0.22)]" : "bg-secondary-900 [--ht-dot:rgba(249,115,22,0.34)]",
      )}
    >
      <div data-stack-shade aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-secondary-900 opacity-0" />

      <div data-stack-inner className="relative mx-auto grid w-full max-w-[1600px] flex-1 origin-top gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col lg:col-span-7">
          <div data-stack-item className="flex flex-wrap items-baseline justify-between gap-4 border-b border-white/25 pb-4">
            <p className="text-caption-mono text-white/80">
              Mode 0{index + 1} · {panel.title}
            </p>
            <p className="max-w-sm text-[15px] leading-relaxed text-white/85 [text-wrap:pretty]">{panel.audience}</p>
          </div>

          <ol className="mt-2">
            {panel.steps.map((step, stepIndex) => (
              <li key={step} data-stack-item className="grid grid-cols-[2.5rem_1fr] items-baseline gap-3 border-b border-white/15 py-4">
                <span className={cn("font-mono-nota text-sm [font-variant-numeric:tabular-nums]", onOrange ? "text-secondary-900" : "text-primary-400")}>
                  0{stepIndex + 1}
                </span>
                <p className="max-w-xl text-[17px] font-semibold leading-snug [text-wrap:pretty] md:text-[18px]">{step}</p>
              </li>
            ))}
          </ol>

          <ul data-stack-item className="mt-6 flex flex-wrap gap-2">
            {panel.rules.map((rule) => (
              <li
                key={rule}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
                  onOrange ? "bg-secondary-900 text-white" : "bg-white/10 text-white ring-1 ring-inset ring-white/20",
                )}
              >
                {rule}
              </li>
            ))}
          </ul>

          <h3
            id={`mode-${panel.id}-title`}
            data-stack-item
            className="font-display-cond mt-auto pt-12 text-[clamp(3.2rem,min(8.5vw,15vh),9.5rem)] leading-[0.82]"
          >
            {panel.tag}
          </h3>
        </div>

        <div className="relative flex items-end justify-center lg:col-span-5">
          <Parallax speed={10} className="w-[min(74vw,400px)] lg:w-[min(30vw,470px)]">
            <Image src={panel.image} alt={panel.imageAlt} width={900} height={1562} sizes="(min-width: 1024px) 30vw, 74vw" className="h-auto w-full select-none" />
          </Parallax>
        </div>
      </div>
    </article>
  );
}

export function ModesSection({ content }: ModesSectionProps) {
  return (
    <section
      id="mode"
      aria-labelledby="mode-title"
      className="relative z-[9] -mt-10 rounded-b-[24px] bg-neutral-100 px-3 md:rounded-b-[40px] md:px-4"
    >
      <div className="mx-auto grid max-w-[1600px] gap-6 px-2 pb-14 pt-32 md:px-6 md:pt-40 lg:grid-cols-12 lg:items-end">
        <p data-scramble className="text-caption-mono text-primary-600 lg:col-span-12">{content.label}</p>
        <Reveal as="h2" id="mode-title" mode="words" className="font-display-cond text-poster-md max-w-[18ch] text-secondary-900 lg:col-span-8">
          {content.titleLead} <span className="hl-box [--hl-bg:var(--color-secondary-900)]">{content.titleAccent}</span>
        </Reveal>
        <p data-lines className="max-w-sm text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty] lg:col-span-3 lg:col-start-10">
          {content.intro}
        </p>
      </div>

      <StickyStack className="grid gap-3 pb-3 md:pb-4">
        <ModePanelView panel={content.campaign} index={0} />
        <ModePanelView panel={content.rateCard} index={1} />
      </StickyStack>
    </section>
  );
}
