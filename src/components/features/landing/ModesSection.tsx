import { cn } from "@/lib/utils";
import type { ModePanel, ModesContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";
import { StickyStack } from "./motion/StickyStack";

interface ModesSectionProps {
  content: ModesContent;
}

function ModePanelView({ panel, index, className }: { panel: ModePanel; index: number; className: string }) {
  const isUmkm = panel.tone === "umkm";
  return (
    <article
      id={`mode-${panel.id}`}
      data-stack-panel
      aria-labelledby={`mode-${panel.id}-title`}
      className={cn("sticky z-[1] flex min-h-svh flex-col justify-center overflow-hidden px-5 py-24 md:px-10 md:py-28", className)}
    >
      <div data-stack-shade aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-secondary-900 opacity-0" />
      <div data-stack-inner className="mx-auto grid w-full max-w-[1400px] origin-top gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <p data-stack-item className="font-mono-nota text-xs uppercase tracking-[0.12em] text-neutral-600">
            0{index + 1} / {panel.tag}
          </p>
          <h3 id={`mode-${panel.id}-title`} data-stack-item className="text-display-lg mt-5 text-secondary-900">
            {panel.title}
          </h3>
          <p data-stack-item className="mt-5 max-w-md text-lg leading-relaxed text-neutral-700">
            {panel.audience}
          </p>
          <ul data-stack-item className="mt-8 flex flex-wrap gap-2">
            {panel.rules.map((rule) => (
              <li
                key={rule}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 ring-inset",
                  isUmkm ? "bg-primary-50 text-primary-700 ring-primary-200" : "bg-secondary-50 text-secondary-800 ring-secondary-200",
                )}
              >
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <ol className="grid gap-3 lg:col-span-7">
          {panel.steps.map((step, stepIndex) => (
            <li
              key={step}
              data-stack-item
              className="flex items-start gap-5 rounded-[24px] bg-white p-5 shadow-[0_1px_2px_rgba(16,32,51,0.04)] ring-1 ring-neutral-200 md:p-6"
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono-nota text-sm font-bold",
                  isUmkm ? "bg-primary-500 text-white" : "bg-secondary-900 text-white",
                )}
              >
                {stepIndex + 1}
              </span>
              <p className="pt-1.5 text-[17px] font-semibold leading-snug text-secondary-900">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

export function ModesSection({ content }: ModesSectionProps) {
  return (
    <section id="mode" data-section-label={content.label} aria-labelledby="mode-title" className="relative z-[9] -mt-10 bg-neutral-100">
      <div className="mx-auto max-w-[1400px] px-5 pb-6 pt-32 md:px-10 md:pt-44">
        <div className="grid gap-8 lg:grid-cols-12">
          <Reveal mode="fade" className="lg:col-span-4">
            <p className="font-mono-nota text-xs uppercase tracking-[0.12em] text-primary-700">{content.label}</p>
          </Reveal>
          <Reveal as="h2" id="mode-title" mode="words" className="text-display-lg text-secondary-900 lg:col-span-8">
            {content.titleLead} <span className="text-primary-500">{content.titleAccent}</span>
          </Reveal>
        </div>
      </div>

      <StickyStack>
        <ModePanelView panel={content.campaign} index={0} className="bg-neutral-100" />
        <ModePanelView
          panel={content.rateCard}
          index={1}
          className="rounded-t-[28px] bg-neutral-25 shadow-[0_-24px_60px_rgba(16,32,51,0.08)] md:rounded-t-[40px]"
        />
      </StickyStack>

      <div className="relative z-[2] rounded-b-[24px] bg-neutral-25 px-5 pb-28 pt-6 md:rounded-b-[40px] md:px-10 md:pb-36">
        <Reveal mode="fade" className="mx-auto max-w-[1400px] overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <caption className="mb-6 text-left font-mono-nota text-xs uppercase tracking-[0.12em] text-neutral-600">
              {content.compare.caption}
            </caption>
            <thead>
              <tr className="border-b-2 border-secondary-900">
                {content.compare.headers.map((header, index) => (
                  <th key={header || "aspek"} scope="col" className={cn("py-4 pr-6 text-sm font-bold text-secondary-900", index === 0 && "w-1/4")}>
                    {header || <span className="sr-only">Aspek</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.compare.rows.map((row) => (
                <tr key={row[0]} className="border-b border-neutral-300">
                  <th scope="row" className="py-4 pr-6 text-sm font-semibold text-neutral-600">
                    {row[0]}
                  </th>
                  <td className="py-4 pr-6 text-[15px] font-semibold text-secondary-900">{row[1]}</td>
                  <td className="py-4 text-[15px] font-semibold text-secondary-900">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}
