import Image from "next/image";
import { routes } from "@/lib/constants/routes";
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
    <ul className="grid gap-4">
      {points.map((point, index) => (
        <li key={point} data-stack-item className="flex items-baseline gap-4 text-[17px] leading-snug text-secondary-900">
          <span className="font-mono-nota text-sm text-primary-600 [font-variant-numeric:tabular-nums]">{index + 1}</span>
          {point}
        </li>
      ))}
    </ul>
  );
}

// An example of AI output, shown as content with its inputs, not as a fake form.
function ExampleBrief({ brief }: { brief: UmkmContent["brief"] }) {
  return (
    <figure className="rounded-3xl bg-secondary-900 p-7 text-white shadow-[0_30px_70px_rgba(16,32,51,0.22)] md:p-9">
      <figcaption className="flex items-center justify-between gap-4 text-[13px]">
        <span className="font-bold text-primary-400">{brief.title}</span>
        <span className="text-white/50">{brief.sampleLabel}</span>
      </figcaption>
      <Scramble
        as="blockquote"
        text={brief.text}
        chars="abcdefghijklmnopqrstuvwxyz"
        duration={2.2}
        className="mt-6 text-[clamp(1.25rem,1.9vw,1.6rem)] font-semibold leading-snug tracking-[-0.015em] [text-wrap:pretty]"
      />
      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
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
  return (
    <section aria-label={`${umkm.label} dan ${kreator.label}`} className="relative z-[6] -mt-10 rounded-b-[24px] md:rounded-b-[40px]">
      <StickyStack>
        <article
          id="umkm"
          data-stack-panel
          data-section-label={umkm.label}
          aria-labelledby="umkm-title"
          className="sticky z-[1] flex min-h-dvh flex-col justify-center overflow-hidden bg-neutral-25 px-5 pb-24 pt-32 md:px-10 md:pt-36"
        >
          <div data-stack-shade aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-secondary-900 opacity-0" />
          <div data-stack-inner className="mx-auto grid w-full max-w-[1400px] origin-top gap-14 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <h2 id="umkm-title" data-stack-item className="text-display-lg text-secondary-900">
                {umkm.titleLead} <span className="text-primary-500">{umkm.titleAccent}</span>
              </h2>
              <div className="mt-8">
                <PointList points={umkm.points} />
              </div>
              <div data-stack-item className="mt-10">
                <LandingButton href={routes.registerWithRole("umkm")} variant="primary" curtain cursorLabel="Mulai">
                  {umkm.cta}
                </LandingButton>
              </div>
            </div>
            <div className="relative lg:col-span-7 lg:col-start-6">
              <div data-stack-item className="mx-auto w-[min(72vw,360px)] lg:ml-auto lg:mr-8 lg:w-[min(26vw,400px)]">
                <Parallax speed={8}>
                  <Image src={umkm.image} alt={umkm.imageAlt} width={900} height={1532} sizes="(min-width: 1024px) 26vw, 72vw" className="h-auto w-full select-none" />
                </Parallax>
              </div>
              <div data-stack-item className="relative -mt-24 lg:absolute lg:bottom-10 lg:left-0 lg:mt-0 lg:w-[56%]">
                <ExampleBrief brief={umkm.brief} />
              </div>
            </div>
          </div>
        </article>

        <article
          id="kreator"
          data-stack-panel
          data-section-label={kreator.label}
          aria-labelledby="kreator-title"
          className="sticky z-[1] flex min-h-dvh flex-col justify-center overflow-hidden rounded-[24px] bg-primary-50 px-5 pb-24 pt-24 shadow-[0_-24px_60px_rgba(16,32,51,0.08)] md:rounded-[40px] md:px-10 md:pt-28"
        >
          <div data-stack-inner className="mx-auto w-full max-w-[1400px] origin-top">
            <h2 id="kreator-title" data-stack-item className="text-display-lg max-w-[18ch] text-secondary-900">
              {kreator.titleLead} <span className="text-primary-500">{kreator.titleAccent}</span>
            </h2>

            <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-8">
              <div data-stack-item className="mx-auto w-[min(70vw,320px)] lg:col-span-3 lg:mx-0 lg:-mt-16 lg:w-full">
                <Parallax speed={8}>
                  <TiltCard>
                    <Image src={kreator.jobImage} alt={kreator.jobImageAlt} width={900} height={1532} sizes="(min-width: 1024px) 22vw, 70vw" className="h-auto w-full select-none" />
                  </TiltCard>
                </Parallax>
              </div>

              <div className="lg:col-span-4 lg:pt-4">
                <PointList points={kreator.points} />
                <div data-stack-item className="mt-10">
                  <LandingButton href={routes.registerWithRole("creator")} variant="dark" curtain cursorLabel="Daftar">
                    {kreator.cta}
                  </LandingButton>
                </div>
              </div>

              <div data-stack-item className="lg:col-span-5">
                <RewardSimulator content={kreator.simulator} />
              </div>
            </div>
          </div>
        </article>
      </StickyStack>
    </section>
  );
}
