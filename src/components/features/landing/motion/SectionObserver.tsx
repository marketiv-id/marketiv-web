"use client";

import { useEffect } from "react";

export const SECTION_EVENT = "landing:section";

// Tells the navbar which section sits in the middle of the viewport; sections opt in with data-section-label.
export function SectionObserver() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section-label]"));
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries.find((entry) => entry.isIntersecting);
        if (!active) return;
        const label = (active.target as HTMLElement).dataset.sectionLabel ?? "";
        window.dispatchEvent(new CustomEvent<string>(SECTION_EVENT, { detail: label }));
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return null;
}
