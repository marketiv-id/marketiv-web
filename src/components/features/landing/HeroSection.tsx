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
  white: "bg-white text-secondary-900",
  orange: "bg-primary-500 text-white",
};

// Positions frame the phone without covering the card title on its screen.
const CHIP_POSITIONS = [
  "-left-6 top-6 sm:-left-28",
  "-right-4 top-[46%] sm:-right-24",
  "bottom-10 -left-4 hidden sm:-left-32 sm:block",
];

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <HeroMotion className="relative z-[12] bg-neutral-25 px-3 pt-3 md:px-4 md:pt-4">
      <div
        data-hero-frame
        className="landing-grain relative isolate flex min-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-[40px] bg-neutral-100 will-change-transform md:min-h-[calc(100dvh-32px)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[18%] -top-[35%] -z-10 h-[85vmax] w-[85vmax] rounded-full bg-[radial-gradient(circle,rgba(253,186,116,0.5)_0%,rgba(254,215,170,0.22)_38%,rgba(248,245,239,0)_66%)]"
        />

        <div data-hero-word-layer aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[-6%] -z-10 flex justify-end pr-[4%]">
          <div data-depth="4">
            <span
              data-hero-word
              data-hero-pre
              className="block select-none text-[clamp(7rem,24vw,24rem)] font-extrabold leading-[0.8] tracking-[-0.07em] text-white/70"
            >
              {content.backdropWord}
            </span>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-5 pb-10 pt-28 md:px-10 lg:pb-12 lg:pt-32">
          <h1 data-hero-title className="max-w-[24ch] text-[clamp(2rem,4.5vw,4.4rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-secondary-900 [text-wrap:balance] lg:max-w-none">
            <span className="block">{content.titleLead}</span>
            <span className="block">
              {content.titleRest} <span className="text-primary-500">{content.titleAccent}</span>
            </span>
          </h1>

          <div className="mt-10 grid flex-1 grid-cols-1 gap-12 lg:mt-12 lg:grid-cols-12 lg:gap-6">
            <div className="flex flex-col lg:col-span-5">
              <p data-hero-fade className="max-w-md text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty] md:text-lg">
                {content.subtitle}
              </p>
              <div data-hero-fade className="mt-8">
                <LandingHeroActions ctaUmkm={content.ctaUmkm} ctaCreator={content.ctaCreator} dashboardCta={content.dashboardCta} />
              </div>
            </div>

            <div data-hero-phone-layer className="relative flex items-start justify-center lg:col-span-6 lg:col-start-7">
              <div data-depth="8" className="relative">
                <div
                  data-hero-phone
                  data-hero-pre
                  className="relative w-[240px] -rotate-[4deg] rounded-[40px] bg-secondary-900 p-2 shadow-[0_40px_80px_rgba(16,32,51,0.24)] sm:w-[268px]"
                >
                  <div className="overflow-hidden rounded-[32px] bg-neutral-50">
                    <div className="flex items-center justify-between px-6 pb-2 pt-3 font-mono-nota text-[10px] text-secondary-900">
                      <span>09.41</span>
                      <span aria-hidden="true" className="h-5 w-20 rounded-full bg-secondary-900" />
                      <span>5G</span>
                    </div>
                    <div className="px-4 pb-3">
                      <p className="text-[15px] font-extrabold tracking-[-0.02em] text-secondary-900">{content.phone.title}</p>
                      <p className="text-[11px] text-neutral-600">{content.phone.subtitle}</p>
                    </div>
                    <div className="px-3 pb-4">
                      <div className="img-outline overflow-hidden rounded-2xl bg-white">
                        <Image
                          src={content.phone.image}
                          alt={content.phone.imageAlt}
                          width={640}
                          height={711}
                          sizes="(min-width: 640px) 252px, 224px"
                          loading="eager"
                          className="h-auto w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {content.chips.map((chip, index) => (
                  <div key={chip.label} data-depth="14" className={cn("absolute z-10", CHIP_POSITIONS[index])}>
                    <div
                      data-hero-chip
                      data-hero-pre
                      className={cn("min-w-[176px] rounded-2xl px-4 py-3 shadow-[0_18px_40px_rgba(16,32,51,0.14)]", CHIP_TONES[chip.tone])}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] font-semibold opacity-80">{chip.label}</span>
                        <span className="text-[10px] font-medium opacity-60">{content.sampleLabel}</span>
                      </div>
                      <Scramble
                        text={chip.value}
                        immediate
                        delay={0.6 + index * 0.12}
                        chars={chip.tone === "white" ? "abcdefghijklmnopqrstuvwxyz./@" : "0123456789"}
                        className="mt-1 block font-mono-nota text-[15px] font-bold tracking-[-0.01em] [font-variant-numeric:tabular-nums]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </HeroMotion>
  );
}
