import Image from "next/image";
import { cn } from "@/lib/utils";
import type { HeroChipTone, HeroContent } from "@/types/landing";
import { HeroMotion } from "./HeroMotion";
import { LandingHeroActions } from "./LandingHeroActions";
import { Scramble } from "./motion/Scramble";

interface HeroSectionProps {
  content: HeroContent;
}

const CHIP_TONES: Record<HeroChipTone, string> = {
  navy: "bg-secondary-900 text-white",
  white: "bg-white text-secondary-900 ring-1 ring-secondary-900/5",
  orange: "bg-primary-500 text-white",
};

// Positions are tuned per chip so they frame the phone without covering its screen.
const CHIP_POSITIONS = [
  "left-[-6%] top-[-4%] sm:left-[-26%]",
  "right-[-6%] top-[46%] sm:right-[-26%]",
  "bottom-[6%] left-[-4%] hidden sm:left-[-22%] sm:block",
];

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <HeroMotion className="relative z-[12] bg-neutral-25 px-3 pt-3 md:px-4 md:pt-4">
      <div
        data-hero-frame
        className="landing-grain relative isolate flex min-h-[calc(100svh-24px)] flex-col overflow-hidden rounded-[28px] bg-neutral-100 will-change-transform md:min-h-[calc(100svh-32px)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[20%] -top-[30%] -z-10 h-[90vmax] w-[90vmax] rounded-full bg-[radial-gradient(circle,rgba(253,186,116,0.55)_0%,rgba(254,215,170,0.25)_35%,rgba(248,245,239,0)_65%)]"
        />

        <div data-hero-word-layer aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[24%] -z-10 flex justify-center lg:top-[14%]">
          <div data-depth="4">
            <span
              data-hero-word
              data-hero-pre
              className="block select-none text-[clamp(7rem,27vw,26rem)] font-extrabold leading-none tracking-[-0.07em] text-primary-100"
            >
              {content.backdropWord}
            </span>
          </div>
        </div>

        <div className="relative mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-10 px-5 pb-10 pt-28 md:px-10 md:pt-36 lg:grid-cols-12 lg:gap-6 lg:pb-14">
          <div className="flex flex-col justify-end lg:col-span-7">
            <p data-hero-fade className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[13px] font-semibold text-secondary-800 ring-1 ring-secondary-900/5">
              <span aria-hidden="true" className="relative inline-flex h-2 w-2 text-primary-500">
                <span className="landing-pulse relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
              </span>
              {content.eyebrow}
            </p>
            <h1 data-hero-title className="max-w-[17ch] text-[clamp(2.4rem,4.8vw,4.8rem)] font-extrabold leading-[0.98] tracking-[-0.045em] text-secondary-900">
              {content.titleLead} {content.titleRest} <span className="text-primary-500">{content.titleAccent}</span>
            </h1>
            <p data-hero-fade className="mt-7 max-w-xl text-base leading-relaxed text-neutral-700 md:text-lg">
              {content.subtitle}
            </p>
            <div data-hero-fade className="mt-8">
              <LandingHeroActions ctaUmkm={content.ctaUmkm} ctaCreator={content.ctaCreator} dashboardCta={content.dashboardCta} />
            </div>
            <p data-hero-fade className="mt-6 font-mono-nota text-[11px] uppercase tracking-[0.1em] text-neutral-600">
              {content.note}
            </p>
          </div>

          <div data-hero-phone-layer className="relative flex items-center justify-center pb-6 lg:col-span-5 lg:pb-0">
            <div data-depth="8" className="relative">
              <div
                data-hero-phone
                data-hero-pre
                className="relative w-[250px] -rotate-[4deg] rounded-[44px] bg-secondary-900 p-2.5 shadow-[0_40px_80px_rgba(16,32,51,0.28)] sm:w-[280px] xl:w-[300px]"
              >
                <div className="overflow-hidden rounded-[36px] bg-neutral-50">
                  <div className="flex items-center justify-between px-6 pb-2 pt-3 font-mono-nota text-[10px] text-secondary-900">
                    <span>09.41</span>
                    <span aria-hidden="true" className="h-5 w-20 rounded-full bg-secondary-900" />
                    <span>5G</span>
                  </div>
                  <div className="px-4 pb-3">
                    <p className="text-[15px] font-extrabold tracking-[-0.02em] text-secondary-900">{content.phone.title}</p>
                    <p className="text-[11px] text-neutral-600">{content.phone.subtitle}</p>
                  </div>
                  <div className="px-3">
                    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
                      <Image
                        src={content.phone.image}
                        alt={content.phone.imageAlt}
                        width={640}
                        height={709}
                        sizes="(min-width: 1280px) 280px, 260px"
                        loading="eager"
                        className="h-auto w-full"
                      />
                    </div>
                  </div>
                  <div aria-hidden="true" className="mx-3 mb-4 mt-3 h-16 rounded-2xl bg-white ring-1 ring-neutral-200" />
                </div>
              </div>

              {content.chips.map((chip, index) => (
                <div key={chip.label} data-depth="14" className={cn("absolute z-10", CHIP_POSITIONS[index])}>
                  <div
                    data-hero-chip
                    data-hero-pre
                    className={cn("min-w-[170px] rounded-2xl px-4 py-3 shadow-[0_18px_40px_rgba(16,32,51,0.16)]", CHIP_TONES[chip.tone])}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-semibold opacity-80">{chip.label}</span>
                      <span className="rounded-full bg-current/10 px-1.5 py-0.5 font-mono-nota text-[9px] uppercase tracking-[0.08em] opacity-70">
                        {content.sampleLabel}
                      </span>
                    </div>
                    <Scramble
                      text={chip.value}
                      immediate
                      delay={0.6 + index * 0.12}
                      chars={chip.tone === "white" ? "abcdefghijklmnopqrstuvwxyz./@" : "0123456789"}
                      className="mt-1 block font-mono-nota text-[15px] font-bold tracking-[-0.01em]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HeroMotion>
  );
}
