import type { ProblemContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";
import { ScrollHighlight } from "./motion/ScrollHighlight";

interface ProblemSectionProps {
  content: ProblemContent;
}

function PainList({ title, items }: { title: string; items: string[] }) {
  return (
    <Reveal mode="fade">
      <h3 className="text-caption-mono text-neutral-600">{title}</h3>
      <ul className="mt-4 border-b border-secondary-900/10">
        {items.map((item, index) => (
          <li key={item} className="grid grid-cols-[2.25rem_1fr] items-baseline border-t border-secondary-900/10 py-4 text-[17px] font-semibold leading-snug text-secondary-900">
            <span className="font-mono-nota text-sm text-primary-600 [font-variant-numeric:tabular-nums]">0{index + 1}</span>
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
      aria-label={content.label}
      className="relative z-[11] -mt-10 rounded-b-[24px] bg-neutral-100 px-5 pb-24 pt-32 md:rounded-b-[40px] md:px-10 md:pb-32 md:pt-40"
    >
      <div className="mx-auto max-w-[1600px]">
        <p className="text-caption-mono text-primary-600">{content.label}</p>
        <ScrollHighlight runs={content.statement} className="text-statement mt-6 max-w-[30ch] text-secondary-900 [text-wrap:balance]" />
        <div className="mt-16 grid gap-12 md:grid-cols-2 md:gap-10 lg:ml-[33.333%] lg:mt-20">
          <PainList title={content.umkm.title} items={content.umkm.items} />
          <PainList title={content.kreator.title} items={content.kreator.items} />
        </div>
      </div>
    </section>
  );
}
