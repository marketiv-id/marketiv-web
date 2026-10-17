import Image from "next/image";
import type { AchievementContent } from "@/types/landing";
import { Parallax } from "./motion/Parallax";
import { Reveal } from "./motion/Reveal";

interface AchievementSectionProps {
  content: AchievementContent;
}

// The first photo is the featured print; any further photos (team, booth, stage) join a scrolling gallery row below it.
export function AchievementSection({ content }: AchievementSectionProps) {
  const [featured, ...gallery] = content.photos;

  return (
    <section
      id="prestasi"
      aria-labelledby="prestasi-title"
      className="relative z-[4] -mt-10 overflow-hidden rounded-b-[24px] bg-white pb-24 pt-32 md:rounded-b-[40px] md:pb-32 md:pt-40"
    >
      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 md:px-10 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="lg:col-span-5">
          <p data-scramble className="text-caption-mono text-primary-600">
            {content.label}
          </p>
          <Reveal as="h2" id="prestasi-title" mode="words" className="font-display-cond text-poster-md mt-5 max-w-[12ch] text-secondary-900">
            {content.titleLead} <span className="hl-box">{content.titleAccent}</span>
          </Reveal>
          <p data-lines className="mt-8 max-w-md text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty]">
            {content.intro}
          </p>
          <dl className="mt-10 border-b border-secondary-900/10">
            {content.facts.map((fact) => (
              <Reveal key={fact.label} mode="fade" className="grid grid-cols-[7.5rem_1fr] items-baseline gap-4 border-t border-secondary-900/10 py-3.5">
                <dt className="text-caption-mono text-neutral-500">{fact.label}</dt>
                <dd className="text-[15px] font-semibold text-secondary-900">{fact.value}</dd>
              </Reveal>
            ))}
          </dl>
        </div>

        {featured && (
          <div className="relative lg:col-span-7">
            <div aria-hidden="true" className="halftone absolute -inset-x-4 -bottom-6 top-10 rounded-[28px] bg-primary-500 [--ht-dot:rgba(255,255,255,0.3)] md:-inset-x-8 md:rounded-[36px]" />
            <Parallax speed={6}>
              <Reveal mode="clip">
                <figure className="relative -rotate-[1.5deg] overflow-hidden rounded-[20px] bg-white p-2 shadow-[0_30px_70px_rgba(16,32,51,0.22)] md:rounded-[26px] md:p-3">
                  <div className="relative aspect-[880/495] overflow-hidden rounded-[14px] md:rounded-[18px]">
                    <Image src={featured.src} alt={featured.alt} fill sizes="(min-width: 1024px) 54vw, 92vw" className="object-cover" />
                  </div>
                  {featured.caption && <figcaption className="text-caption-mono px-2 pb-1 pt-3 text-neutral-600">{featured.caption}</figcaption>}
                </figure>
              </Reveal>
            </Parallax>
          </div>
        )}
      </div>

      {gallery.length > 0 && (
        <ul className="mx-auto mt-16 flex max-w-[1600px] snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mt-24 md:px-10">
          {gallery.map((photo, index) => (
            <Reveal as="li" key={photo.src} mode="clip" delay={index * 0.06} className="w-[70vw] shrink-0 snap-start sm:w-[40vw] lg:w-[26vw]">
              <figure className="group/shot">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-neutral-200 md:rounded-[28px]">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 1024px) 26vw, (min-width: 640px) 40vw, 70vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/shot:scale-[1.04]"
                  />
                </div>
                {photo.caption && <figcaption className="text-caption-mono mt-3 text-neutral-600">{photo.caption}</figcaption>}
              </figure>
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
