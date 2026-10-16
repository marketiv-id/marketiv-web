import { cn } from "@/lib/utils";
import type { ModePanel, ModesContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";
import { StickyStack } from "./motion/StickyStack";

interface ModesSectionProps {
  content: ModesContent;
}

function ModePanelView({ panel, className }: { panel: ModePanel; className: string }) {
  const isUmkm = panel.tone === "umkm";
  return (
    <article
      id={`mode-${panel.id}`}
      data-stack-panel
      aria-labelledby={`mode-${panel.id}-title`}
      className={cn("sticky z-[1] flex min-h-dvh flex-col justify-center overflow-hidden px-5 py-24 md:px-10", className)}
    >
      <div data-stack-shade aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-secondary-900 opacity-0" />
      <div data-stack-inner className="mx-auto w-full max-w-[1400px] origin-top">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p data-stack-item className={cn("text-[15px] font-bold", isUmkm ? "text-primary-600" : "text-secondary-600")}>
              {panel.tag}
            </p>
            <h3 id={`mode-${panel.id}-title`} data-stack-item className="mt-2 text-[clamp(2.6rem,6vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.05em] text-secondary-900">
              {panel.title}
            </h3>
          </div>
          <p data-stack-item className="max-w-sm text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty]">
            {panel.audience}
          </p>
        </div>

        <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {panel.steps.map((step, index) => (
            <li
              key={step}
              data-stack-item
              className={cn(
                "flex min-h-[180px] flex-col justify-between gap-6 rounded-3xl p-6",
                isUmkm ? "bg-white" : "bg-neutral-100",
              )}
            >
              <span
                className={cn(
                  "font-mono-nota text-[2.5rem] font-bold leading-none [font-variant-numeric:tabular-nums]",
                  isUmkm ? "text-primary-500" : "text-secondary-900",
                )}
              >
                {index + 1}
              </span>
              <p className="text-[16px] font-semibold leading-snug text-secondary-900 [text-wrap:pretty]">{step}</p>
            </li>
          ))}
        </ol>

        <ul data-stack-item className="mt-8 flex flex-wrap gap-2">
          {panel.rules.map((rule) => (
            <li
              key={rule}
              className={cn(
                "rounded-full px-4 py-2 text-[13px] font-semibold",
                isUmkm ? "bg-primary-100 text-primary-800" : "bg-secondary-100 text-secondary-800",
              )}
            >
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function ModesSection({ content }: ModesSectionProps) {
  return (
    <section
      id="mode"
      data-section-label={content.label}
      aria-labelledby="mode-title"
      className="relative z-[9] -mt-10 rounded-b-[24px] bg-neutral-25 md:rounded-b-[40px]"
    >
      <div className="mx-auto max-w-[1400px] px-5 pt-32 md:px-10 md:pt-40">
        <Reveal as="h2" id="mode-title" mode="words" className="text-display-lg max-w-[20ch] text-secondary-900">
          {content.titleLead} <span className="text-primary-500">{content.titleAccent}</span>
        </Reveal>
      </div>

      <StickyStack>
        <ModePanelView panel={content.campaign} className="bg-neutral-25" />
        <ModePanelView
          panel={content.rateCard}
          className="rounded-[24px] bg-white shadow-[0_-24px_60px_rgba(16,32,51,0.08)] md:rounded-[40px]"
        />
      </StickyStack>
    </section>
  );
}
