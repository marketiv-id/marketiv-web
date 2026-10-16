import { ChartLineUp, ShieldCheck, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import type { PillarIcon, PillarsContent } from "@/types/landing";
import { Parallax } from "./motion/Parallax";
import { Reveal } from "./motion/Reveal";
import { Spotlight } from "./motion/Spotlight";

interface PillarsSectionProps {
  content: PillarsContent;
}

const ICONS: Record<PillarIcon, typeof ShieldCheck> = {
  shield: ShieldCheck,
  chart: ChartLineUp,
  users: UsersThree,
};

// Two-column zigzag: the right column starts lower and drifts faster, so the cards read as a staggered stack.
const PLACEMENT = ["lg:col-start-1 lg:row-start-1", "lg:col-start-2 lg:row-start-1 lg:mt-40", "lg:col-start-1 lg:row-start-2"];
const SPEED = [4, 12, 4];

export function PillarsSection({ content }: PillarsSectionProps) {
  return (
    <section
      id="solusi"
      data-section-label={content.label}
      aria-labelledby="solusi-title"
      className="relative z-[10] -mt-10 rounded-b-[24px] bg-neutral-100 px-3 pb-3 pt-32 md:rounded-b-[40px] md:px-4 md:pb-4 md:pt-40"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(194,65,12,0.16)_1.2px,transparent_1.2px)] bg-[size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_55%)]" />

      <div className="relative mx-auto max-w-3xl px-2 text-center">
        <Reveal as="h2" id="solusi-title" mode="words" className="text-display-lg mx-auto max-w-[16ch] text-secondary-900">
          {content.titleLead} <span className="text-primary-500">{content.titleAccent}</span>
        </Reveal>
        <Reveal mode="fade" delay={0.1}>
          <p className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-neutral-700 [text-wrap:pretty]">{content.intro}</p>
        </Reveal>
      </div>

      <div className="landing-grain relative isolate mt-20 overflow-hidden rounded-[32px] bg-[#1d0e06] px-5 py-16 text-white md:rounded-[40px] md:px-10 md:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_15%_10%,rgba(249,115,22,0.95)_0%,rgba(234,88,12,0.55)_35%,transparent_70%),radial-gradient(50%_60%_at_90%_95%,rgba(194,65,12,0.5)_0%,transparent_70%)]"
        />
        <Spotlight />
        <ul className="relative z-[2] mx-auto grid max-w-[1100px] gap-5 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-8">
          {content.items.map((item, index) => {
            const Icon = ICONS[item.icon];
            return (
              <li key={item.title} className={cn(PLACEMENT[index])}>
                <Parallax speed={SPEED[index]}>
                  <Reveal mode="clip" delay={index * 0.08}>
                    <article className="group flex min-h-[420px] flex-col rounded-3xl bg-white/[0.06] p-8 ring-1 ring-inset ring-white/15 backdrop-blur-md transition-[box-shadow,background-color] duration-500 hover:bg-white/[0.09] hover:ring-white/30 md:min-h-[460px] md:p-10">
                      <h3 className="text-2xl font-extrabold tracking-[-0.02em] md:text-[28px]">
                        <span className="font-mono-nota text-white/60">0{index + 1}</span> {item.title}
                      </h3>
                      <div className="flex flex-1 items-center justify-center py-10">
                        <Icon aria-hidden="true" weight="thin" className="h-32 w-32 text-white/90 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110" />
                      </div>
                      <p className="max-w-sm text-[16px] leading-relaxed text-white/75">{item.description}</p>
                    </article>
                  </Reveal>
                </Parallax>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
