import { MapPin } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ContextContent } from "@/types/landing";
import { Marquee } from "./motion/Marquee";
import { Reveal } from "./motion/Reveal";

interface ContextSectionProps {
  content: ContextContent;
}

type CategoryCard = ContextContent["categoryCards"][number];

// Roveia-style category card: one photo, a 2x2 grid when the card groups several niches, or a flat brand field.
function NicheCard({ card, index }: { card: CategoryCard; index: number }) {
  const grid = card.images?.length ? card.images : null;
  const hasMedia = Boolean(card.image || grid);
  return (
    <Reveal as="li" mode="clip" delay={index * 0.06} className="w-[76vw] shrink-0 snap-start sm:w-auto">
      <article
        className={cn(
          "group/niche relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[22px] p-5 text-white md:rounded-[28px] md:p-6",
          hasMedia ? "bg-neutral-300" : "halftone bg-primary-500 [--ht-dot:rgba(255,255,255,0.3)]",
        )}
      >
        {card.image && (
          <Image
            src={card.image}
            alt={card.imageAlt ?? ""}
            fill
            sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 76vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/niche:scale-[1.05]"
          />
        )}
        {grid && (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[3px] bg-secondary-900">
            {grid.map((image) => (
              <div key={image.src} className="relative overflow-hidden">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 1024px) 12vw, (min-width: 640px) 23vw, 38vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/niche:scale-[1.06]"
                />
              </div>
            ))}
          </div>
        )}
        {hasMedia && <div aria-hidden="true" className="photo-scrim absolute inset-0" />}
        <span className="text-caption-mono absolute left-5 top-5 rounded-full bg-black/25 px-2 py-0.5 text-white/90 md:left-6 md:top-6">0{index + 1}</span>
        <div className="relative">
          <h3 className="font-display-cond text-[clamp(2.2rem,min(3vw,6vh),3.1rem)] leading-[0.88]">{card.label}</h3>
          <p className="mt-2 text-[14px] font-medium text-white/85">{card.description}</p>
        </div>
      </article>
    </Reveal>
  );
}

export function ContextSection({ content }: ContextSectionProps) {
  return (
    <section
      id="konteks"
      aria-labelledby="konteks-title"
      className="relative z-[5] -mt-10 overflow-hidden rounded-b-[24px] bg-neutral-100 pt-32 md:rounded-b-[40px] md:pt-40"
    >
      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 md:px-10 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-5">
          <p data-scramble className="text-caption-mono text-primary-600">
            {content.label}
          </p>
          <Reveal as="h2" id="konteks-title" mode="words" className="font-display-cond text-poster-md mt-5 max-w-[15ch] text-secondary-900">
            {content.titleLead} <span className="hl-box">{content.titleAccent}</span>
          </Reveal>
          <p data-lines className="mt-8 max-w-md text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty]">
            {content.intro}
          </p>
        </div>

        {/* Four facts as a bento: where the team works, how far the platform reaches, the program, and the SDG it serves. */}
        <ul className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:col-span-7">
          <Reveal as="li" mode="clip">
            <article className="halftone relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-[24px] bg-secondary-900 p-6 text-white [--ht-dir:200deg] [--ht-dot:rgba(249,115,22,0.45)] md:rounded-[28px] md:p-8">
              <div className="relative flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500">
                  <MapPin aria-hidden="true" weight="fill" className="h-5 w-5" />
                </span>
                <p className="text-caption-mono text-white/60">{content.origin.label}</p>
              </div>
              <div className="relative mt-auto pt-10">
                <p className="font-display-cond text-[clamp(2.8rem,min(4.2vw,8vh),4.4rem)] leading-[0.82]">{content.origin.city}</p>
                <p className="mt-2 text-[17px] font-semibold text-primary-400">{content.origin.region}</p>
                <p className="mt-4 max-w-[26ch] text-[15px] leading-relaxed text-white/70 [text-wrap:pretty]">{content.origin.text}</p>
                <p className="mt-6 border-t border-white/10 pt-4 font-mono-nota text-[12px] text-white/45 [font-variant-numeric:tabular-nums]">
                  {content.origin.coordinates}
                </p>
              </div>
            </article>
          </Reveal>

          <Reveal as="li" mode="clip" delay={0.08}>
            <article className="halftone relative flex h-full flex-col overflow-hidden rounded-[24px] bg-primary-500 p-6 text-white [--ht-dot:rgba(255,255,255,0.3)] md:rounded-[28px] md:p-7">
              <p className="text-caption-mono relative text-white/80">{content.reach.label}</p>
              <p className="font-display-cond relative mt-3 text-[clamp(2.3rem,min(3.2vw,6vh),3.2rem)] leading-[0.86]">{content.reach.title}</p>
              <p className="relative mt-3 text-[15px] leading-relaxed text-white/90 [text-wrap:pretty]">{content.reach.text}</p>
              <ul className="relative mt-5 flex flex-wrap gap-1.5">
                {content.reach.chips.map((chip) => (
                  <li key={chip} className="rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-primary-700">
                    {chip}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          <Reveal as="li" mode="clip" delay={0.14}>
              <article className="flex h-full flex-col rounded-[24px] bg-white p-5 ring-1 ring-secondary-900/[0.07] md:rounded-[28px] md:p-6">
                <p className="text-caption-mono text-neutral-500">{content.program.label}</p>
                <p className="font-display-cond mt-2 text-[clamp(2.4rem,min(3.4vw,6.5vh),3.4rem)] leading-[0.86] text-secondary-900">{content.program.title}</p>
                <p className="mt-auto pt-6 text-[14px] leading-relaxed text-neutral-600 [text-wrap:pretty]">{content.program.text}</p>
              </article>
          </Reveal>
          <Reveal as="li" mode="clip" delay={0.2}>
              <article className="relative flex h-full flex-col overflow-hidden rounded-[24px] bg-secondary-900/[0.05] p-5 md:rounded-[28px] md:p-6">
                <p className="text-caption-mono text-neutral-500">{content.sdg.label}</p>
                <p className="mt-2 flex items-baseline gap-1.5 text-secondary-900">
                  <span className="font-display-cond text-[clamp(1.4rem,min(1.8vw,3.4vh),1.8rem)] leading-none">SDG</span>
                  <span className="font-display-cond text-[clamp(2.4rem,min(3.4vw,6.5vh),3.4rem)] leading-[0.86] text-primary-500">{content.sdg.number}</span>
                </p>
                <p className="mt-3 text-[15px] font-semibold leading-snug text-secondary-900 [text-wrap:pretty]">{content.sdg.title}</p>
                <p className="mt-auto pt-4 text-[14px] leading-relaxed text-neutral-600 [text-wrap:pretty]">{content.sdg.text}</p>
              </article>
          </Reveal>
        </ul>
      </div>

      <div className="mx-auto mt-24 max-w-[1600px] px-5 md:mt-32 md:px-10">
        <h3 className="border-t border-secondary-900/10 pt-5 text-[17px] font-bold text-secondary-900">{content.categoriesTitle}</h3>
        <ul className="-mx-5 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {content.categoryCards.map((card, index) => (
            <NicheCard key={card.label} card={card} index={index} />
          ))}
        </ul>
      </div>

      <div aria-hidden="true" className="halftone relative mt-24 bg-primary-500 py-6 [--ht-dir:90deg] [--ht-dot:rgba(255,255,255,0.28)] md:mt-32 md:py-10">
        <Marquee top={content.categoriesTop} bottom={content.categoriesBottom} onOrange />
      </div>
    </section>
  );
}
