import type { ProblemContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";
import { ScrollHighlight } from "./motion/ScrollHighlight";

interface ProblemSectionProps {
  content: ProblemContent;
}

function PainList({ title, items }: { title: string; items: string[] }) {
  return (
    <Reveal mode="fade">
      <h3 className="font-mono-nota text-[11px] uppercase tracking-[0.12em] text-neutral-600">{title}</h3>
      <ul className="mt-5 divide-y divide-neutral-300 border-y border-neutral-300">
        {items.map((item, index) => (
          <li key={item} className="flex items-baseline gap-4 py-4 text-[17px] font-semibold text-secondary-900">
            <span className="font-mono-nota text-xs text-primary-700">0{index + 1}</span>
            {item}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function ProblemSection({ content }: ProblemSectionProps) {
  return (
    <section
      id="masalah"
      data-section-label={content.label}
      className="relative z-[11] -mt-px rounded-b-[24px] bg-neutral-25 px-5 pb-24 pt-28 md:rounded-b-[40px] md:px-10 md:pb-32 md:pt-40"
    >
      <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Reveal mode="fade">
            <p className="font-mono-nota text-xs uppercase tracking-[0.12em] text-primary-700">{content.label}</p>
          </Reveal>
        </div>
        <div className="lg:col-span-8">
          <ScrollHighlight runs={content.statement} className="text-statement text-secondary-900" />
          <div className="mt-16 grid gap-10 md:grid-cols-2 md:gap-8">
            <PainList title={content.umkm.title} items={content.umkm.items} />
            <PainList title={content.kreator.title} items={content.kreator.items} />
          </div>
        </div>
      </div>
    </section>
  );
}
