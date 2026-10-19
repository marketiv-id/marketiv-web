"use client";

import { Fragment, useRef, type ElementType } from "react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface AiTypewriterProps {
  text: string;
  as?: ElementType;
  className?: string;
  // Seconds between words; roughly the pace of a streamed chat answer.
  wordDelay?: number;
  // Elements revealed after the text finishes, for example the inputs the answer was written from.
  followSelector?: string;
}

// Plays like a streamed AI answer: typing dots, then words arriving one by one behind a blinking caret.
// Every word is in the server HTML and keeps its space while hidden, so the card never grows or reflows as it types.
export function AiTypewriter({ text, as: Tag = "p", className, wordDelay = 0.09, followSelector }: AiTypewriterProps) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(" ");

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const spans = gsap.utils.toArray<HTMLElement>(el.querySelectorAll("[data-ai-word]"));
        const caret = el.querySelector<HTMLElement>("[data-ai-caret]");
        const dots = el.querySelector<HTMLElement>("[data-ai-dots]");
        // Queried from the document: selectors inside useGSAP are scoped to this element, and the follow-up rows sit outside it.
        const follow = followSelector ? Array.from(document.querySelectorAll<HTMLElement>(followSelector)) : [];
        if (!caret || !dots) return;
        const home = caret.parentElement;

        gsap.set(spans, { autoAlpha: 0 });
        gsap.set(follow, { autoAlpha: 0, y: 12 });

        const tl = gsap.timeline({ paused: true });
        tl.set(dots, { autoAlpha: 1 })
          .to({}, { duration: 0.9 })
          .set(dots, { autoAlpha: 0 })
          .set(caret, { autoAlpha: 1 });
        const start = tl.duration();
        spans.forEach((span, index) => {
          const at = start + index * wordDelay;
          tl.call(() => span.after(caret), [], at).to(span, { autoAlpha: 1, duration: 0.16, ease: "power1.out" }, at);
        });
        const end = tl.duration();
        tl.to(follow, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.08 }, end + 0.2).to(caret, { autoAlpha: 0, duration: 0.25 }, end + 1.4);

        const trigger = ScrollTrigger.create({ trigger: el, start: "top 80%", once: true, onEnter: () => tl.play() });

        return () => {
          tl.kill();
          trigger.kill();
          if (home) home.appendChild(caret);
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [text] },
  );

  return (
    <Tag ref={ref} className={cn("relative", className)}>
      <span data-ai-dots aria-hidden="true" className="invisible absolute left-0 top-[0.45em] flex gap-1.5 opacity-0">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="ai-dot h-2 w-2 rounded-full bg-white/70" style={{ animationDelay: `${dot * 0.16}s` }} />
        ))}
      </span>
      {/* The space stays outside each word, so the caret lands right after the last letter. */}
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span data-ai-word>{word}</span>
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
      {/* Zero-width caret, so moving it between words never shifts the line. */}
      <span data-ai-caret aria-hidden="true" className="invisible relative inline-block w-0 opacity-0">
        <span className="ai-caret absolute -top-[0.82em] left-[0.12em] h-[1.05em] w-[2px] rounded-full bg-primary-400" />
      </span>
    </Tag>
  );
}
