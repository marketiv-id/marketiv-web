import { routes } from "@/lib/constants/routes";
import type { KreatorContent, UmkmContent } from "@/types/landing";
import { JobCarousel } from "./JobCarousel";
import { LandingButton } from "./motion/LandingButton";
import { RewardSimulator } from "./RewardSimulator";
import { Scramble } from "./motion/Scramble";
import { StickyStack } from "./motion/StickyStack";

interface AudienceSectionProps {
  umkm: UmkmContent;
  kreator: KreatorContent;
}

function PointList({ points, tone }: { points: string[]; tone: "umkm" | "kreator" }) {
  return (
    <ul className="mt-8 grid gap-3">
      {points.map((point) => (
        <li key={point} data-stack-item className="flex items-start gap-3 text-[17px] font-semibold leading-snug text-secondary-900">
          <span
            aria-hidden="true"
            className={tone === "umkm" ? "mt-2 h-2 w-2 shrink-0 rotate-45 bg-primary-500" : "mt-2 h-2 w-2 shrink-0 rotate-45 bg-secondary-900"}
          />
          {point}
        </li>
      ))}
    </ul>
  );
}

function BriefMockup({ brief }: { brief: UmkmContent["brief"] }) {
  const fields = [
    { label: brief.productLabel, value: brief.productValue },
    { label: brief.budgetLabel, value: brief.budgetValue },
    { label: brief.rateLabel, value: brief.rateValue },
  ];
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-[0_30px_70px_rgba(16,32,51,0.12)] ring-1 ring-neutral-200 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-extrabold tracking-[-0.02em] text-secondary-900">{brief.title}</p>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono-nota text-[10px] uppercase tracking-[0.1em] text-neutral-600">{brief.sampleLabel}</span>
      </div>
      <div aria-hidden="true" className="mt-4 flex gap-1.5">
        {[0, 1, 2, 3].map((step) => (
          <span key={step} className={step < 2 ? "h-1 flex-1 rounded-full bg-primary-500" : "h-1 flex-1 rounded-full bg-neutral-200"} />
        ))}
      </div>
      <dl className="mt-6 grid gap-3">
        {fields.map((field) => (
          <div key={field.label} data-stack-item className="rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-neutral-200">
            <dt className="text-[12px] text-neutral-600">{field.label}</dt>
            <dd className="mt-0.5 font-mono-nota text-[15px] font-bold text-secondary-900">{field.value}</dd>
          </div>
        ))}
      </dl>
      <div data-stack-item className="mt-4 rounded-2xl bg-primary-50 p-4 ring-1 ring-primary-200">
        <p className="flex items-center gap-2 text-[12px] font-bold text-primary-700">
          <span aria-hidden="true" className="relative inline-flex h-2 w-2 text-primary-500">
            <span className="landing-pulse relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
          </span>
          {brief.aiLabel}
        </p>
        <Scramble
          as="p"
          text={brief.aiText}
          chars="abcdefghijklmnopqrstuvwxyz"
          duration={2.2}
          className="mt-2 text-[15px] leading-relaxed text-secondary-900"
        />
      </div>
    </div>
  );
}

export function AudienceSection({ umkm, kreator }: AudienceSectionProps) {
  return (
    <section aria-label="Untuk UMKM dan kreator" className="relative z-[6] -mt-10 rounded-b-[24px] md:rounded-b-[40px]">
      <StickyStack>
        <article
          id="umkm"
          data-stack-panel
          data-section-label={umkm.label}
          aria-labelledby="umkm-title"
          className="sticky z-[1] flex min-h-svh flex-col justify-center overflow-hidden bg-neutral-25 px-5 pb-24 pt-32 md:px-10 md:pt-36"
        >
          <div data-stack-shade aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-secondary-900 opacity-0" />
          <div data-stack-inner className="mx-auto grid w-full max-w-[1400px] origin-top gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <p data-stack-item className="font-mono-nota text-xs uppercase tracking-[0.12em] text-primary-700">{umkm.label}</p>
              <h2 id="umkm-title" data-stack-item className="text-display-lg mt-5 text-secondary-900">
                {umkm.titleLead} <span className="text-primary-500">{umkm.titleAccent}</span>
              </h2>
              <PointList points={umkm.points} tone="umkm" />
              <div data-stack-item className="mt-10">
                <LandingButton href={routes.registerWithRole("umkm")} variant="primary" curtain cursorLabel="Mulai">
                  {umkm.cta}
                </LandingButton>
              </div>
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <BriefMockup brief={umkm.brief} />
            </div>
          </div>
        </article>

        <article
          id="kreator"
          data-stack-panel
          data-section-label={kreator.label}
          aria-labelledby="kreator-title"
          className="sticky z-[1] min-h-svh overflow-hidden rounded-t-[28px] rounded-b-[24px] bg-primary-50 px-5 pb-24 pt-24 shadow-[0_-24px_60px_rgba(16,32,51,0.08)] md:rounded-t-[40px] md:rounded-b-[40px] md:px-10 md:pt-28"
        >
          <div data-stack-inner className="mx-auto grid max-w-[1400px] origin-top gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p data-stack-item className="font-mono-nota text-xs uppercase tracking-[0.12em] text-primary-700">{kreator.label}</p>
              <h2 id="kreator-title" data-stack-item className="text-display-lg mt-5 text-secondary-900">
                {kreator.titleLead} <span className="text-primary-500">{kreator.titleAccent}</span>
              </h2>
              <PointList points={kreator.points} tone="kreator" />
              <div data-stack-item className="mt-10">
                <LandingButton href={routes.registerWithRole("creator")} variant="dark" curtain cursorLabel="Daftar">
                  {kreator.cta}
                </LandingButton>
              </div>
            </div>
            <div className="grid gap-8 lg:col-span-7">
              <div data-stack-item>
                <JobCarousel title={kreator.jobsTitle} sampleLabel={kreator.jobsSampleLabel} cta={kreator.jobCta} labels={kreator.jobLabels} jobs={kreator.jobs} />
              </div>
              <div data-stack-item className="lg:max-w-[460px]">
                <RewardSimulator content={kreator.simulator} />
              </div>
            </div>
          </div>
        </article>
      </StickyStack>
    </section>
  );
}
