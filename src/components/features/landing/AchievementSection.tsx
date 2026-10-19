import Image from "next/image";
import { cn } from "@/lib/utils";
import type { AchievementContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";

interface AchievementSectionProps {
  content: AchievementContent;
}

type Photo = AchievementContent["photos"][number];

// Collage slots for the first three prints on desktop: the portrait banner fills the left column,
// the two landscape pieces stack on the right. Later photos join the scrolling row below.
const SLOTS = ["lg:col-start-2 lg:row-start-1", "lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:self-center", "lg:col-start-2 lg:row-start-2"];
const TILTS = ["-rotate-[2deg]", "rotate-[2.5deg]", "-rotate-[1.25deg]", "rotate-[1.75deg]", "-rotate-[2.25deg]"];
const SPANS = ["col-span-2 lg:col-span-1", "col-span-1", "col-span-1"];

function Polaroid({ photo, index, sizes }: { photo: Photo; index: number; sizes: string }) {
  return (
    <figure
      className={cn(
        "group/polaroid relative rounded-[6px] bg-white p-2.5 pb-3 shadow-[0_22px_50px_rgba(16,32,51,0.22)] ring-1 ring-black/5 md:p-3 md:pb-4",
        "transition-[rotate,translate,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:rotate-0 hover:shadow-[0_30px_70px_rgba(16,32,51,0.3)]",
        TILTS[index % TILTS.length],
      )}
    >
      <span aria-hidden="true" className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-3 bg-primary-500/70 md:w-24" />
      <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes={sizes} className="h-auto w-full rounded-[3px]" />
      {photo.caption && <figcaption className="text-caption-mono px-1 pt-3 text-neutral-600">{photo.caption}</figcaption>}
    </figure>
  );
}

export function AchievementSection({ content }: AchievementSectionProps) {
  const collage = content.photos.slice(0, 3);
  const rest = content.photos.slice(3);

  return (
    <section
      id="prestasi"
      aria-labelledby="prestasi-title"
      className="relative z-[4] -mt-10 overflow-hidden rounded-b-[24px] bg-white pb-24 pt-32 md:rounded-b-[40px] md:pb-32 md:pt-40"
    >
      <div className="mx-auto grid max-w-[1600px] gap-14 px-5 md:px-10 lg:grid-cols-12 lg:items-center lg:gap-8">
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

        <div className="relative lg:col-span-7">
          <div aria-hidden="true" className="halftone absolute -inset-x-3 bottom-[-6%] top-[8%] rounded-[28px] bg-primary-500 [--ht-dot:rgba(255,255,255,0.3)] md:-inset-x-6 md:rounded-[36px]" />
          <ul className="relative grid grid-cols-2 items-start gap-x-4 gap-y-10 px-2 py-6 md:gap-x-6 md:px-6 lg:grid-cols-[0.82fr_1fr] lg:gap-y-8">
            {collage.map((photo, index) => (
              <Reveal as="li" key={photo.src} mode="clip" delay={index * 0.1} className={cn(SPANS[index], SLOTS[index])}>
                <Polaroid photo={photo} index={index} sizes={index === 0 ? "(min-width: 1024px) 30vw, 88vw" : "(min-width: 1024px) 26vw, 44vw"} />
              </Reveal>
            ))}
          </ul>
        </div>
      </div>

      {rest.length > 0 && (
        <ul className="mx-auto mt-16 flex max-w-[1600px] snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-6 pt-4 [scrollbar-width:none] md:mt-24 md:px-10">
          {rest.map((photo, index) => (
            <Reveal as="li" key={photo.src} mode="clip" delay={index * 0.06} className="w-[64vw] shrink-0 snap-start sm:w-[36vw] lg:w-[22vw]">
              <Polaroid photo={photo} index={index + 3} sizes="(min-width: 1024px) 22vw, (min-width: 640px) 36vw, 64vw" />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
