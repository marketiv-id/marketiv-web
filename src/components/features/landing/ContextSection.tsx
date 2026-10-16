import { MapPin } from "@phosphor-icons/react/dist/ssr";
import type { ContextContent } from "@/types/landing";
import { Marquee } from "./motion/Marquee";
import { Reveal } from "./motion/Reveal";

interface ContextSectionProps {
  content: ContextContent;
}

export function ContextSection({ content }: ContextSectionProps) {
  return (
    <section
      id="konteks"
      data-section-label={content.label}
      aria-labelledby="konteks-title"
      className="relative z-[5] -mt-10 overflow-hidden rounded-b-[24px] bg-neutral-100 pb-20 pt-32 md:rounded-b-[40px] md:pb-28 md:pt-40"
    >
      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 md:px-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Reveal as="h2" id="konteks-title" mode="words" className="text-display-lg max-w-[16ch] text-secondary-900">
            {content.titleLead} <span className="text-primary-500">{content.titleAccent}</span>
          </Reveal>
          <ul className="mt-10 grid max-w-xl gap-5">
            {content.facts.map((fact) => (
              <Reveal as="li" key={fact} mode="fade" className="text-[18px] leading-snug text-neutral-700 [text-wrap:pretty]">
                {fact}
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal mode="clip" className="lg:col-span-4 lg:col-start-9">
          <div className="landing-grain relative overflow-hidden rounded-3xl bg-secondary-900 p-8 text-white">
            <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.45),rgba(249,115,22,0)_70%)]" />
            <div className="relative">
              <p className="text-[13px] text-white/60">{content.mapLabel}</p>
              <div className="mt-14 flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500">
                  <MapPin aria-hidden="true" weight="fill" className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-3xl font-extrabold tracking-[-0.03em]">{content.mapCity}</p>
                  <p className="text-[14px] text-white/60">{content.mapRegion}</p>
                </div>
              </div>
              <p className="mt-8 font-mono-nota text-[13px] text-white/50 [font-variant-numeric:tabular-nums]">{content.coordinates}</p>
            </div>
          </div>
        </Reveal>
      </div>

      <div aria-hidden="true" className="mt-24 md:mt-32">
        <Marquee top={content.categoriesTop} bottom={content.categoriesBottom} />
      </div>
    </section>
  );
}
