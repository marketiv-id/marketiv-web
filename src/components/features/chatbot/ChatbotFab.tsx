"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChatbotPanel } from "@/components/features/chatbot/ChatbotPanel";
import { TivvyAvatar } from "@/components/features/chatbot/TivvyAvatar";

export function ChatbotFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ChatbotPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />

      {/* A round avatar on phones (the landing CTA bar sits beside it); a labelled pill from md up. */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Tutup Tivvy, asisten AI Marketiv" : "Buka Tivvy, asisten AI Marketiv"}
        aria-expanded={isOpen}
        className={cn(
          "group fixed bottom-6 right-6 z-40 flex h-14 items-center gap-3 rounded-full bg-secondary-900 p-1 text-white",
          "shadow-[0_18px_40px_rgba(16,32,51,0.32)] ring-1 ring-white/10 transition-[translate,scale,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(16,32,51,0.38)] active:scale-[0.96] md:pr-5",
        )}
      >
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-500">
          <TivvyAvatar size={48} className={cn("transition-[opacity,scale] duration-300", isOpen ? "scale-75 opacity-0" : "scale-100 opacity-100")} />
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
        </span>
        {!isOpen && (
          <span aria-hidden="true" className="absolute left-[2.6rem] top-1.5 h-3 w-3 rounded-full bg-success ring-2 ring-secondary-900" />
        )}
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[14px] font-bold">{isOpen ? "Tutup chat" : "Tanya Tivvy"}</span>
          <span className="block text-[11px] text-white/60">Asisten AI Marketiv</span>
        </span>
      </button>
    </>
  );
}
