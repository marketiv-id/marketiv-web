import Image from "next/image";
import type { ReactNode } from "react";
import type { PreviewContent } from "@/types/landing";
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
      aria-labelledby="preview-title"
      className="relative z-[7] -mt-10 rounded-b-[24px] bg-white pt-10 md:rounded-b-[40px]"
    >
      <HorizontalTrack className="lg:flex lg:h-dvh lg:flex-col lg:justify-center" trackClassName="lg:gap-12 lg:pl-[max(2.5rem,calc((100vw-1600px)/2+2.5rem))] lg:pr-[10vw]">
        <div className="flex w-[85vw] shrink-0 snap-start flex-col justify-center pt-20 sm:w-[60vw] lg:w-[30vw] lg:pt-0">
          <p data-scramble className="text-caption-mono text-primary-600">{content.label}</p>
          <Reveal as="h2" id="preview-title" mode="words" className="font-display-cond text-poster-sm mt-5 text-secondary-900">
            {content.titleLead} <span className="hl-box">{content.titleAccent}</span>
          </Reveal>
          <p data-lines className="mt-6 max-w-sm text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty]">{content.intro}</p>
          <p className="mt-4 max-w-sm text-[13px] text-neutral-500">{content.caption}</p>
        </div>

        {content.panels.map((panel, index) => {
          const figure = (
            <figure className="flex flex-col gap-4 lg:gap-5">
              <div data-track-media>
                <BrowserFrame>
                  {/* A plain zoom on hover keeps the screenshot sharp; the old displacement filter read as blur. */}
                  <div className="group/shot relative aspect-[1600/956] overflow-hidden">
                    <Image
                      src={panel.image}
                      alt={panel.alt}
                      fill
                      sizes="(min-width: 1024px) 58vw, 88vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/shot:scale-[1.025]"
                    />
                  </div>
                </BrowserFrame>
              </div>
              <figcaption className="max-w-xl">
                <p className="text-caption-mono text-primary-600">{panel.tag}</p>
                <p className="mt-1 text-xl font-extrabold tracking-[-0.02em] text-secondary-900 [text-wrap:balance] lg:text-[clamp(1.15rem,min(1.6vw,3.4vh),1.5rem)]">{panel.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-neutral-700">{panel.description}</p>
              </figcaption>
            </figure>
          );
          return (
            <div key={panel.id} className="w-[88vw] shrink-0 snap-center sm:w-[75vw] lg:w-[min(52vw,calc((100dvh-300px)*1.67))]">
              {index === 0 ? <ScrollScale from={0.86}>{figure}</ScrollScale> : figure}
            </div>
          );
        })}
      </HorizontalTrack>
      <div aria-hidden="true" className="h-16 lg:h-0" />
    </section>
  );
}
