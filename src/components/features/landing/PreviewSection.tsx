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
    <div className="overflow-hidden rounded-3xl bg-white p-2 shadow-[0_30px_70px_rgba(16,32,51,0.14)]">
      <div aria-hidden="true" className="flex items-center gap-1.5 px-3 pb-2.5 pt-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
      </div>
      <div className="img-outline overflow-hidden rounded-2xl">{children}</div>
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
      <HorizontalTrack className="lg:flex lg:h-dvh lg:items-center" trackClassName="lg:gap-12 lg:pl-[max(2.5rem,calc((100vw-1400px)/2+2.5rem))] lg:pr-[10vw]">
        <div className="flex w-[85vw] shrink-0 snap-start flex-col justify-center pt-20 sm:w-[60vw] lg:w-[30vw] lg:pt-0">
          <p className="text-[15px] font-bold text-primary-600">{content.label}</p>
          <Reveal as="h2" id="preview-title" mode="words" className="text-display-lg mt-4 text-secondary-900">
            {content.titleLead} <span className="text-primary-500">{content.titleAccent}</span>
          </Reveal>
          <p className="mt-6 max-w-sm text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty]">{content.intro}</p>
          <p className="mt-4 max-w-sm text-[13px] text-neutral-500">{content.caption}</p>
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
              <figcaption className="max-w-xl">
                <p className="text-[15px] font-bold text-primary-600">{panel.tag}</p>
                <p className="mt-1 text-xl font-extrabold tracking-[-0.02em] text-secondary-900 md:text-2xl">{panel.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-neutral-700">{panel.description}</p>
              </figcaption>
            </figure>
          );
          return (
            <div key={panel.id} className="w-[88vw] shrink-0 snap-center sm:w-[75vw] lg:w-[56vw]">
              {index === 0 ? <ScrollScale from={0.86}>{figure}</ScrollScale> : figure}
            </div>
          );
        })}
      </HorizontalTrack>
      <div aria-hidden="true" className="h-16 lg:h-0" />
    </section>
  );
}
