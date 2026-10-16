import type { ReactNode } from "react";
import type { PreviewContent } from "@/types/landing";
import { DistortImage } from "./motion/DistortImage";
import { HorizontalTrack } from "./motion/HorizontalTrack";
import { Reveal } from "./motion/Reveal";
import { ScrollScale } from "./motion/ScrollScale";

interface PreviewSectionProps {
  content: PreviewContent;
}

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_rgba(16,32,51,0.16)] ring-1 ring-secondary-900/10">
      <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="ml-3 h-5 flex-1 rounded-full bg-neutral-200/70" />
      </div>
      {children}
    </div>
  );
}

export function PreviewSection({ content }: PreviewSectionProps) {
  return (
    <section
      id="preview"
      data-section-label={content.label}
      aria-labelledby="preview-title"
      className="relative z-[7] -mt-10 rounded-b-[24px] bg-neutral-100 pt-10 md:rounded-b-[40px]"
    >
      <HorizontalTrack className="lg:flex lg:h-svh lg:items-center" trackClassName="lg:gap-10 lg:pl-[max(2.5rem,calc((100vw-1400px)/2+2.5rem))] lg:pr-[10vw]">
        <div className="flex w-[85vw] shrink-0 snap-start flex-col justify-center pt-20 sm:w-[60vw] lg:w-[32vw] lg:pt-0">
          <p className="font-mono-nota text-xs uppercase tracking-[0.12em] text-primary-700">{content.label}</p>
          <Reveal as="h2" id="preview-title" mode="words" className="text-display-lg mt-5 text-secondary-900">
            {content.titleLead} <span className="text-primary-500">{content.titleAccent}</span>
          </Reveal>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-neutral-700">{content.intro}</p>
          <p className="mt-6 font-mono-nota text-[11px] uppercase tracking-[0.1em] text-neutral-600">{content.caption}</p>
          <p aria-hidden="true" className="mt-10 hidden items-center gap-3 font-mono-nota text-[11px] uppercase tracking-[0.12em] text-neutral-500 lg:flex">
            <span className="h-px w-10 bg-neutral-400" /> {content.scrollHint}
          </p>
        </div>

        {content.panels.map((panel, index) => {
          const figure = (
            <figure className="flex flex-col gap-6">
              <div data-track-media>
                <BrowserFrame>
                  <DistortImage
                    src={panel.image}
                    alt={panel.alt}
                    width={1600}
                    height={956}
                    sizes="(min-width: 1024px) 58vw, 88vw"
                    className="aspect-[1600/956]"
                    cursorLabel="Lihat"
                  />
                </BrowserFrame>
              </div>
              <figcaption className="grid gap-2 md:grid-cols-[auto_1fr] md:gap-8">
                <span className="h-fit w-fit self-start whitespace-nowrap rounded-full bg-white px-3 py-1 font-mono-nota text-[11px] uppercase tracking-[0.1em] text-secondary-800 ring-1 ring-secondary-900/10">
                  0{index + 1} / {panel.tag}
                </span>
                <div>
                  <p className="text-xl font-extrabold tracking-[-0.02em] text-secondary-900 md:text-2xl">{panel.title}</p>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-neutral-700">{panel.description}</p>
                </div>
              </figcaption>
            </figure>
          );
          return (
            <div key={panel.id} className="w-[88vw] shrink-0 snap-center sm:w-[75vw] lg:w-[58vw]">
              {index === 0 ? <ScrollScale from={0.86}>{figure}</ScrollScale> : figure}
            </div>
          );
        })}
      </HorizontalTrack>
      <div aria-hidden="true" className="h-16 lg:h-0" />
    </section>
  );
}
