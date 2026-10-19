"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChatbotPanel } from "@/components/features/chatbot/ChatbotPanel";
import { TivvyAvatar } from "@/components/features/chatbot/TivvyAvatar";

// How long the button stays tucked away after the last downward scroll before it comes back.
const RETURN_DELAY_MS = 900;

export function ChatbotFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [tucked, setTucked] = useState(false);
  const lastY = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  // A compact avatar that steps aside while the visitor reads downward, so it never sits on content for long.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastY.current + 4;
      lastY.current = y;
      window.clearTimeout(timer.current);
      setTucked(goingDown && y > 200);
      timer.current = window.setTimeout(() => setTucked(false), RETURN_DELAY_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer.current);
    };
  }, []);

  const hidden = tucked && !isOpen;

  return (
    <>
      <ChatbotPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Tutup Tivvy, asisten AI Marketiv" : "Buka Tivvy, asisten AI Marketiv"}
        aria-expanded={isOpen}
        className={cn(
          "group fixed bottom-5 right-5 z-40 flex h-[52px] items-center rounded-full bg-secondary-900 p-1 text-white md:bottom-6 md:right-6",
          "shadow-[0_14px_32px_rgba(16,32,51,0.3)] ring-1 ring-white/10",
          "transition-[translate,opacity,scale] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.94]",
          hidden ? "pointer-events-none translate-y-[140%] opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-500">
          <TivvyAvatar size={44} className={cn("transition-[opacity,scale] duration-300", isOpen ? "scale-75 opacity-0" : "scale-100 opacity-100")} />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className={cn("absolute h-5 w-5 transition-[opacity,rotate] duration-300", isOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0")}
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
          {!isOpen && <span aria-hidden="true" className="absolute right-0 top-0 h-3 w-3 rounded-full bg-success ring-2 ring-secondary-900" />}
        </span>
        {/* The label only slides out on hover or keyboard focus, so at rest the button is a small circle. */}
        <span
          aria-hidden="true"
          className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr]"
        >
          <span className="overflow-hidden whitespace-nowrap">
            <span className="block pl-3 pr-4 text-[13px] font-bold">{isOpen ? "Tutup chat" : "Tanya Tivvy"}</span>
          </span>
        </span>
      </button>
    </>
  );
}
