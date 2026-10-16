import type { ProblemContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";
import { ScrollHighlight } from "./motion/ScrollHighlight";

interface ProblemSectionProps {
  content: ProblemContent;
}

function PainList({ title, items }: { title: string; items: string[] }) {
  return (
    <Reveal mode="fade">
      <h3 className="text-[15px] font-bold text-secondary-900">{title}</h3>
      <ul className="mt-5 grid gap-4">
        {items.map((item, index) => (
          <li key={item} className="flex items-baseline gap-4 text-[17px] leading-snug text-neutral-700">
            <span className="font-mono-nota text-sm text-primary-600 [font-variant-numeric:tabular-nums]">{index + 1}</span>
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
      aria-label={content.label}
      className="relative z-[11] rounded-b-[24px] bg-neutral-25 px-5 pb-24 pt-28 md:rounded-b-[40px] md:px-10 md:pb-32 md:pt-36"
    >
      <div className="mx-auto max-w-[1400px]">
        <ScrollHighlight runs={content.statement} className="text-statement max-w-[30ch] text-secondary-900 [text-wrap:balance] lg:ml-[16.66%]" />
        <div className="mt-16 grid gap-12 md:grid-cols-2 md:gap-10 lg:ml-[16.66%] lg:max-w-[880px]">
          <PainList title={content.umkm.title} items={content.umkm.items} />
          <PainList title={content.kreator.title} items={content.kreator.items} />
        </div>
      </div>
    </section>
  );
}
