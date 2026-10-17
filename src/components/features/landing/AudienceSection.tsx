import Image from "next/image";
import { routes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { KreatorContent, UmkmContent } from "@/types/landing";
import { LandingButton } from "./motion/LandingButton";
import { Parallax } from "./motion/Parallax";
import { RewardSimulator } from "./RewardSimulator";
import { Scramble } from "./motion/Scramble";
import { StickyStack } from "./motion/StickyStack";
import { TiltCard } from "./motion/TiltCard";

interface AudienceSectionProps {
  umkm: UmkmContent;
  kreator: KreatorContent;
}

function PointList({ points }: { points: string[] }) {
  return (
    <ul className="border-b border-secondary-900/10">
      {points.map((point, index) => (
        <li key={point} data-stack-item className="grid grid-cols-[2.25rem_1fr] items-baseline border-t border-secondary-900/10 py-3.5 text-[16px] font-semibold leading-snug text-secondary-900">
          <span className="font-mono-nota text-sm text-primary-600 [font-variant-numeric:tabular-nums]">0{index + 1}</span>
          {point}
        </li>
      ))}
    </ul>
  );
}

// Onseis-style photo card: the image carries the frame and zooms slightly on hover.
function PhotoCard({ src, alt, sizes, className }: { src: string; alt: string; sizes: string; className?: string }) {
  return (
    <figure className={cn("group/photo relative overflow-hidden rounded-[22px] bg-neutral-200 md:rounded-[28px]", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/photo:scale-[1.04]" />
    </figure>
  );
}

// An example of AI output, shown as content with its inputs, not as a fake form.
function ExampleBrief({ brief }: { brief: UmkmContent["brief"] }) {
  return (
    <figure className="rounded-[22px] bg-secondary-900 p-6 text-white shadow-[0_30px_70px_rgba(16,32,51,0.25)] md:rounded-[28px] md:p-8">
      <figcaption className="flex items-center justify-between gap-4">
        <span className="text-caption-mono text-primary-400">{brief.title}</span>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/70">{brief.sampleLabel}</span>
      </figcaption>
      <Scramble
        as="blockquote"
        text={brief.text}
        chars="abcdefghijklmnopqrstuvwxyz"
        duration={2.2}
        className="mt-5 text-[clamp(1.1rem,1.5vw,1.4rem)] font-semibold leading-snug tracking-[-0.015em] [text-wrap:pretty]"
      />
      <dl className="mt-6 grid gap-3 border-t border-white/15 pt-5 sm:grid-cols-3">
        {brief.meta.map((item) => (
          <div key={item.label}>
            <dt className="text-[12px] text-white/50">{item.label}</dt>
            <dd className="mt-1 text-[14px] font-semibold text-white">{item.value}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

export function AudienceSection({ umkm, kreator }: AudienceSectionProps) {
  // overflow-clip (not hidden) rounds the section bottom without turning it into a scroll container, so the panels stay sticky.
  return (
    <section aria-label={`${umkm.label} dan ${kreator.label}`} className="relative z-[6] -mt-10 overflow-clip rounded-b-[24px] md:rounded-b-[40px]">
      <StickyStack>
        <article
          id="umkm"
          data-stack-panel
          aria-labelledby="umkm-title"
          className="sticky z-[1] flex min-h-dvh flex-col justify-center overflow-hidden bg-neutral-100 px-5 pb-20 pt-32 md:px-10 md:pt-36"
        >
          <div data-stack-shade aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-secondary-900 opacity-0" />
          <div data-stack-inner className="mx-auto grid w-full max-w-[1600px] origin-top gap-12 lg:grid-cols-12 lg:items-center lg:gap-8">
            <div className="lg:col-span-5">
              <p data-stack-item data-scramble className="text-caption-mono text-primary-600">{umkm.label}</p>
              <h2 id="umkm-title" data-stack-item className="font-display-cond text-poster-sm mt-5 max-w-[14ch] text-secondary-900">
                {umkm.titleLead} <span className="hl-box">{umkm.titleAccent}</span>
              </h2>
              <div className="mt-8">
                <PointList points={umkm.points} />
              </div>
              <div data-stack-item className="mt-8">
                <LandingButton href={routes.registerWithRole("umkm")} variant="primary" curtain arrow cursorLabel="Mulai">
                  {umkm.cta}
                </LandingButton>
              </div>
            </div>

            <div className="relative lg:col-span-7 lg:h-[min(78vh,720px)]">
              <div data-stack-item className="relative lg:absolute lg:right-0 lg:top-0 lg:h-[76%] lg:w-[56%]">
                <PhotoCard src={umkm.photo} alt={umkm.photoAlt} sizes="(min-width: 1024px) 30vw, 92vw" className="aspect-[4/3] lg:aspect-auto lg:h-full" />
              </div>
              <div data-stack-item className="hidden lg:absolute lg:left-0 lg:top-[4%] lg:block lg:h-[46%] lg:w-[34%]">
                <Parallax speed={6} className="h-full">
                  <PhotoCard src={umkm.secondPhoto} alt={umkm.secondPhotoAlt} sizes="16vw" className="h-full" />
                </Parallax>
              </div>
              <div data-stack-item className="hidden lg:absolute lg:bottom-0 lg:right-[3%] lg:z-10 lg:block lg:w-[19%]">
                <Parallax speed={14}>
                  <Image src={umkm.image} alt={umkm.imageAlt} width={900} height={1532} sizes="(min-width: 1024px) 12vw, 34vw" className="h-auto w-full select-none drop-shadow-[0_24px_40px_rgba(16,32,51,0.3)]" />
                </Parallax>
              </div>
              <div data-stack-item className="relative z-[5] -mt-10 mx-3 lg:absolute lg:bottom-0 lg:left-[6%] lg:mx-0 lg:mt-0 lg:w-[58%]">
                <ExampleBrief brief={umkm.brief} />
              </div>
            </div>
          </div>
        </article>

        <article
          id="kreator"
          data-stack-panel
          aria-labelledby="kreator-title"
          className="sticky z-[1] flex min-h-dvh flex-col justify-center overflow-hidden rounded-t-[24px] bg-white px-5 pb-20 pt-24 shadow-[0_-24px_60px_rgba(16,32,51,0.08)] md:rounded-t-[40px] md:px-10 md:pt-28"
        >
          <div data-stack-inner className="mx-auto w-full max-w-[1600px] origin-top">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <p data-stack-item data-scramble className="text-caption-mono text-primary-600">{kreator.label}</p>
                <h2 id="kreator-title" data-stack-item className="font-display-cond text-poster-sm mt-5 max-w-[18ch] text-secondary-900">
                  {kreator.titleLead} <span className="hl-box [--hl-bg:var(--color-secondary-900)]">{kreator.titleAccent}</span>
                </h2>
              </div>
            </div>

            <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-8">
              <div data-stack-item className="relative lg:col-span-4">
                <PhotoCard src={kreator.photo} alt={kreator.photoAlt} sizes="(min-width: 1024px) 26vw, 92vw" className="aspect-[4/5]" />
                <div className="absolute -bottom-8 -right-3 w-[38%] max-w-[170px] lg:-right-10 lg:w-[44%] lg:max-w-none">
                  <Parallax speed={10}>
                    <TiltCard>
                      <Image src={kreator.jobImage} alt={kreator.jobImageAlt} width={900} height={1532} sizes="(min-width: 1024px) 12vw, 38vw" className="h-auto w-full select-none drop-shadow-[0_24px_40px_rgba(16,32,51,0.3)]" />
                    </TiltCard>
                  </Parallax>
                </div>
              </div>

              <div className="lg:col-span-3 lg:col-start-6">
                <PointList points={kreator.points} />
                <div data-stack-item className="mt-8">
                  <LandingButton href={routes.registerWithRole("creator")} variant="dark" curtain cursorLabel="Daftar">
                    {kreator.cta}
                  </LandingButton>
                </div>
              </div>

              <div data-stack-item className="lg:col-span-4 lg:col-start-9">
                <RewardSimulator content={kreator.simulator} />
              </div>
            </div>
          </div>
        </article>
      </StickyStack>
    </section>
  );
}
