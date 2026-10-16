import { ChartLineUp, ShieldCheck, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import type { PillarIcon, PillarsContent } from "@/types/landing";
import { Parallax } from "./motion/Parallax";
import { Reveal } from "./motion/Reveal";
import { ScreenSlice } from "./motion/ScreenSlice";
import { Spotlight } from "./motion/Spotlight";
import { TiltCard } from "./motion/TiltCard";

interface PillarsSectionProps {
  content: PillarsContent;
}

const ICONS: Record<PillarIcon, typeof ChartLineUp> = {
  chart: ChartLineUp,
  shield: ShieldCheck,
  users: UsersThree,
};

// The middle card drops lower and drifts faster, giving the zigzag its depth.
const OFFSETS = ["lg:mt-0", "lg:mt-24", "lg:mt-0"];
const SPEEDS = [6, 14, 6];

export function PillarsSection({ content }: PillarsSectionProps) {
  return (
    <section
      id="solusi"
      data-section-label={content.label}
      className="landing-grain relative isolate z-[10] -mt-10 overflow-hidden rounded-b-[24px] bg-secondary-900 px-5 pb-28 pt-36 text-white md:rounded-b-[40px] md:px-10 md:pb-36 md:pt-48"
    >
      <ScreenSlice colorClassName="bg-neutral-25" />
      <Spotlight />
      <div className="relative z-[2] mx-auto max-w-[1400px]">
        <div className="grid gap-8 lg:grid-cols-12">
          <Reveal mode="fade" className="lg:col-span-4">
            <p className="font-mono-nota text-xs uppercase tracking-[0.12em] text-primary-400">{content.label}</p>
          </Reveal>
          <Reveal as="h2" mode="words" className="text-display-lg lg:col-span-8">
            {content.titleLead} <span className="text-primary-400">{content.titleAccent}</span>
          </Reveal>
        </div>

        <ul className="mt-20 grid gap-5 md:grid-cols-3 md:gap-6">
          {content.items.map((item, index) => {
            const Icon = ICONS[item.icon];
            return (
              <li key={item.no} className={cn(OFFSETS[index])}>
                <Parallax speed={SPEEDS[index]}>
                  <Reveal mode="clip" delay={index * 0.08}>
                    <TiltCard className="group flex min-h-[380px] flex-col rounded-[28px] bg-white/[0.04] p-7 ring-1 ring-inset ring-white/10 backdrop-blur-sm transition-[box-shadow] duration-500 hover:ring-primary-500/60 md:min-h-[440px]">
                      <p className="font-mono-nota text-sm text-white/70">
                        {item.no} <span className="text-white/35">/</span> {item.title}
                      </p>
                      <div className="flex flex-1 items-center justify-center py-10">
                        <Icon aria-hidden="true" weight="thin" className="h-28 w-28 text-primary-400 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110" />
                      </div>
                      <h3 className="text-2xl font-extrabold tracking-[-0.02em]">{item.title}</h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-white/70">{item.description}</p>
                    </TiltCard>
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
