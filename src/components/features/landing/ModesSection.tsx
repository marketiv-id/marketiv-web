import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ModePanel, ModesContent } from "@/types/landing";
import { Parallax } from "./motion/Parallax";
import { Reveal } from "./motion/Reveal";
import { StickyStack } from "./motion/StickyStack";

interface ModesSectionProps {
  content: ModesContent;
}

// DontMatter-style service panel: full-viewport colour field, the product render as the hero object,
// and the mode name set huge in the bottom-left corner.
function ModePanelView({ panel }: { panel: ModePanel }) {
  const onOrange = panel.tone === "umkm";
  return (
    <article
      id={`mode-${panel.id}`}
      data-stack-panel
      aria-labelledby={`mode-${panel.id}-title`}
      className={cn(
        "landing-grain sticky z-[1] flex min-h-dvh flex-col overflow-hidden rounded-[24px] px-5 pb-10 pt-28 md:rounded-[40px] md:px-10 md:pb-14",
        onOrange ? "bg-primary-500 text-white" : "bg-white text-secondary-900 shadow-[0_-24px_60px_rgba(16,32,51,0.08)]",
      )}
    >
      {onOrange && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_85%_20%,rgba(253,186,116,0.7)_0%,transparent_60%),radial-gradient(60%_60%_at_0%_100%,rgba(154,52,18,0.55)_0%,transparent_70%)]"
        />
      )}
      <div data-stack-shade aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-secondary-900 opacity-0" />

      <div data-stack-inner className="relative mx-auto grid w-full max-w-[1400px] flex-1 origin-top gap-10 lg:grid-cols-12">
        <div className="flex flex-col lg:col-span-6">
          <p data-stack-item className={cn("max-w-sm text-[17px] leading-relaxed [text-wrap:pretty]", onOrange ? "text-white/85" : "text-neutral-700")}>
            {panel.audience}
          </p>

          <ol className="mt-10 grid gap-4">
            {panel.steps.map((step, index) => (
              <li key={step} data-stack-item className="flex items-baseline gap-5">
                <span className={cn("font-mono-nota text-sm [font-variant-numeric:tabular-nums]", onOrange ? "text-white/60" : "text-primary-600")}>
                  0{index + 1}
                </span>
                <p className={cn("max-w-md text-[18px] font-semibold leading-snug [text-wrap:pretty]", onOrange ? "text-white" : "text-secondary-900")}>{step}</p>
              </li>
            ))}
          </ol>

          <ul data-stack-item className="mt-8 flex flex-wrap gap-2">
            {panel.rules.map((rule) => (
              <li
                key={rule}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-semibold",
                  onOrange ? "bg-white/15 text-white ring-1 ring-inset ring-white/25" : "bg-secondary-50 text-secondary-800",
                )}
              >
                {rule}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-14">
            <p data-stack-item className={cn("text-[15px] font-bold", onOrange ? "text-white/80" : "text-primary-600")}>
              {panel.title}
            </p>
            <h3 id={`mode-${panel.id}-title`} data-stack-item className="mt-1 text-[clamp(3rem,8.5vw,8.5rem)] font-extrabold leading-[0.88] tracking-[-0.055em]">
              {panel.tag}
            </h3>
          </div>
        </div>

        <div className="relative flex items-center justify-center lg:col-span-6">
          <Parallax speed={10} className="w-[min(78vw,420px)] lg:w-[min(32vw,500px)]">
            <Image src={panel.image} alt={panel.imageAlt} width={900} height={1562} sizes="(min-width: 1024px) 32vw, 78vw" className="h-auto w-full select-none" />
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
      data-section-label={content.label}
      aria-labelledby="mode-title"
      className="relative z-[9] -mt-10 rounded-b-[24px] bg-neutral-25 px-3 md:rounded-b-[40px] md:px-4"
    >
      <div className="mx-auto max-w-[1400px] px-2 pb-16 pt-32 text-center md:px-6 md:pt-40">
        <Reveal as="h2" id="mode-title" mode="words" className="text-display-lg mx-auto max-w-[20ch] text-secondary-900">
          {content.titleLead} <span className="text-primary-500">{content.titleAccent}</span>
        </Reveal>
      </div>

      <StickyStack className="grid gap-3 pb-3 md:pb-4">
        <ModePanelView panel={content.campaign} />
        <ModePanelView panel={content.rateCard} />
      </StickyStack>
    </section>
  );
}
