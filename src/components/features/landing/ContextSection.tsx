import type { ContextContent } from "@/types/landing";
import { Marquee } from "./motion/Marquee";
import { Reveal } from "./motion/Reveal";

interface ContextSectionProps {
  content: ContextContent;
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

export function ContextSection({ content }: ContextSectionProps) {
  return (
    <section
      id="konteks"
      data-section-label={content.label}
      aria-labelledby="konteks-title"
      className="relative z-[5] -mt-10 overflow-hidden rounded-b-[24px] bg-neutral-100 pb-24 pt-36 md:rounded-b-[40px] md:pb-32 md:pt-48"
    >
      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 md:px-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="font-mono-nota text-xs uppercase tracking-[0.12em] text-primary-700">{content.label}</p>
          <Reveal as="h2" id="konteks-title" mode="words" className="text-display-lg mt-5 text-secondary-900">
            {content.titleLead} <span className="text-primary-500">{content.titleAccent}</span>
          </Reveal>
          <ul className="mt-10 grid gap-4">
            {content.facts.map((fact) => (
              <Reveal as="li" key={fact} mode="fade" className="max-w-xl border-l-2 border-primary-500 pl-5 text-lg font-semibold leading-snug text-secondary-900">
                {fact}
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal mode="clip" className="lg:col-span-4 lg:col-start-9 lg:self-end">
          <div className="relative overflow-hidden rounded-[28px] bg-secondary-900 p-7 text-white">
            <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="relative">
              <p className="font-mono-nota text-[11px] uppercase tracking-[0.12em] text-white/50">{content.mapLabel}</p>
              <div className="mt-16 flex items-center gap-3">
                <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white">
                  <span aria-hidden="true" className="landing-pulse absolute inset-0 rounded-full text-primary-500" />
                  <span className="relative">
                    <PinIcon />
                  </span>
                </span>
                <div>
                  <p className="text-2xl font-extrabold tracking-[-0.02em]">{content.mapCity}</p>
                  <p className="text-sm text-white/60">{content.mapRegion}</p>
                </div>
              </div>
              <p className="mt-6 font-mono-nota text-[12px] tracking-[0.06em] text-white/60">{content.coordinates}</p>
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
