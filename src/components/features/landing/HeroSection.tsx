import Image from "next/image";
import { cn } from "@/lib/utils";
import type { HeroContent, HeroStripItem } from "@/types/landing";
import { HeroMotion } from "./HeroMotion";
import { LandingHeroActions } from "./LandingHeroActions";

interface HeroSectionProps {
  content: HeroContent;
}

function StripCell({ item, hidden }: { item: HeroStripItem; hidden?: boolean }) {
  const screen = item.kind === "screen";
  return (
    <figure
      aria-hidden={hidden || undefined}
      className={cn(
        "relative aspect-[4/5] w-[42vw] shrink-0 overflow-hidden rounded-[18px] sm:w-[30vw] lg:w-full",
        screen ? "bg-primary-500 halftone [--ht-dir:160deg] [--ht-size:9px]" : "bg-neutral-200",
      )}
    >
      <Image
        src={item.src}
        alt={hidden ? "" : item.alt}
        fill
        sizes="(min-width: 1024px) 18vw, 42vw"
        className={cn("select-none", screen ? "object-contain object-bottom px-3 pt-6" : "object-cover")}
      />
    </figure>
  );
}

// b2p-style poster hero: condensed headline on paper, a tilted strip of real-world photos and app screens cutting through it.
export function HeroSection({ content }: HeroSectionProps) {
  return (
    <HeroMotion className="relative z-[12] overflow-hidden rounded-b-[24px] bg-white md:rounded-b-[40px]">
      <div className="relative mx-auto flex min-h-[100svh] max-w-[1600px] flex-col px-5 pb-10 pt-28 md:px-10 md:pt-32 lg:pb-8 lg:pt-28">
        <ul data-hero-fade data-hero-meta className="text-caption-mono grid grid-cols-2 gap-x-6 border-b border-secondary-900/10 pb-4 text-neutral-600 md:grid-cols-3 lg:mr-[clamp(240px,25vw,440px)]">
          {content.meta.map((item, index) => (
            <li key={item} className={cn(index === 1 && "hidden md:block", index === 2 && "text-right")}>
              {item}
            </li>
          ))}
        </ul>

        <h1
          data-hero-title
          className="font-display-cond relative z-[3] mt-8 max-w-[15ch] text-[clamp(2.6rem,min(5.6vw,9.4vh),6.75rem)] leading-[0.88] text-secondary-900 md:mt-8 lg:max-w-[min(68vw,1120px)]"
        >
          {content.titleLead} {content.titleRest} <span className="hl-box">{content.titleAccent}</span>
        </h1>

        <div data-hero-strip-mobile className="-mx-5 mt-10 overflow-hidden py-4 lg:hidden">
          <div className="-rotate-3">
            <div data-hero-strip-track="x" className="flex w-max gap-3">
              {[...content.strip, ...content.strip].map((item, index) => (
                <StripCell key={`${item.src}-${index}`} item={item} hidden={index >= content.strip.length} />
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-[3] mt-10 grid gap-8 lg:mt-auto lg:grid-cols-12 lg:items-end lg:gap-6 lg:pt-8">
          <div className="lg:col-span-6">
            <p data-hero-fade className="max-w-md text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty]">
              {content.subtitle}
            </p>
            <div data-hero-fade className="mt-8">
              <LandingHeroActions ctaUmkm={content.ctaUmkm} ctaCreator={content.ctaCreator} dashboardCta={content.dashboardCta} />
            </div>
          </div>
          <ul data-hero-fade className="grid gap-2 lg:col-span-3 lg:col-start-7">
            {content.proof.map((item) => (
              <li key={item} className="flex items-center gap-3 border-t border-secondary-900/10 pt-2 text-[14px] font-semibold text-secondary-900">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rotate-45 bg-primary-500" />
                {item}
              </li>
            ))}
            <li className="text-caption-mono pt-2 text-neutral-500">{content.stripCaption}</li>
          </ul>
        </div>
      </div>

      <div
        data-hero-strip
        className="pointer-events-none absolute bottom-[-12%] right-[clamp(1.5rem,7vw,9rem)] top-[-12%] z-[2] hidden w-[clamp(170px,16vw,270px)] rotate-[9deg] lg:block"
      >
        <div data-depth="12" className="h-full">
          <div data-hero-strip-scroll className="h-full">
            <div data-hero-strip-track="y" className="flex flex-col gap-3">
              {[...content.strip, ...content.strip].map((item, index) => (
                <StripCell key={`${item.src}-${index}`} item={item} hidden={index >= content.strip.length} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </HeroMotion>
  );
}
