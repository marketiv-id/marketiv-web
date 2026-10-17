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

// Roveia-style category card: a photo (or a flat brand field when there is no honest photo) with the niche set as a poster word.
function NicheCard({ card, index }: { card: CategoryCard; index: number }) {
  const flatTone = index === 0 ? "bg-primary-500 [--ht-dot:rgba(255,255,255,0.3)]" : "bg-secondary-900 [--ht-dot:rgba(249,115,22,0.4)]";
  return (
    <Reveal as="li" mode="clip" delay={index * 0.06} className="w-[76vw] shrink-0 snap-start sm:w-auto">
      <article className={cn("group/niche relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[22px] p-5 text-white md:rounded-[28px] md:p-6", card.image ? "bg-neutral-300" : cn("halftone", flatTone))}>
        {card.image && (
          <>
            <Image
              src={card.image}
              alt={card.imageAlt ?? ""}
              fill
              sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 92vw"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/niche:scale-[1.05]"
            />
            <div aria-hidden="true" className="photo-scrim absolute inset-0" />
          </>
        )}
        <span className="text-caption-mono absolute left-5 top-5 text-white/80 md:left-6 md:top-6">0{index + 1}</span>
        <div className="relative">
          <h3 className="font-display-cond text-[clamp(2.4rem,3.6vw,3.6rem)] leading-[0.86]">{card.label}</h3>
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
      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 md:px-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="text-caption-mono text-primary-600">{content.label}</p>
          <Reveal as="h2" id="konteks-title" mode="words" className="font-display-cond text-poster-md mt-5 max-w-[14ch] text-secondary-900">
            {content.titleLead} <span className="hl-box">{content.titleAccent}</span>
          </Reveal>
          <ul className="mt-10 max-w-xl border-b border-secondary-900/10">
            {content.facts.map((fact) => (
              <Reveal as="li" key={fact} mode="fade" className="border-t border-secondary-900/10 py-4 text-[17px] leading-snug text-neutral-700 [text-wrap:pretty]">
                {fact}
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal mode="clip" className="lg:col-span-4 lg:col-start-9">
          <div className="halftone relative overflow-hidden rounded-[28px] bg-secondary-900 p-8 text-white [--ht-dir:200deg] [--ht-dot:rgba(249,115,22,0.45)]">
            <p className="text-caption-mono text-white/60">{content.mapLabel}</p>
            <div className="mt-16 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500">
                <MapPin aria-hidden="true" weight="fill" className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display-cond text-5xl leading-none">{content.mapCity}</p>
                <p className="mt-1 text-[14px] text-white/60">{content.mapRegion}</p>
              </div>
            </div>
            <p className="mt-10 font-mono-nota text-[13px] text-white/50 [font-variant-numeric:tabular-nums]">{content.coordinates}</p>
          </div>
        </Reveal>
      </div>

      <div className="mx-auto mt-24 max-w-[1600px] px-5 md:mt-32 md:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-secondary-900/10 pt-5">
          <h3 className="text-[17px] font-bold text-secondary-900">{content.categoriesTitle}</h3>
          <p className="text-caption-mono text-neutral-500">{content.categoriesNote}</p>
        </div>
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
