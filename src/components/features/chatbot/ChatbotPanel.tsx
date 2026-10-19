"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { account } from "@/lib/appwrite/account";
import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";
import {
  getChatbotSuggestions,
  type ChatbotAudience,
} from "@/services/chatbot/chatbot-guardrails";
import {
  getTivvyLoadingMessage,
  getTivvyWelcomeMessage,
  shouldShowChatbotSuggestions,
} from "@/services/chatbot/chatbot-ui";
import { ChatbotLoadingState } from "./ChatbotLoadingState";
import { ChatbotSuggestions } from "./ChatbotSuggestions";
import { TivvyAvatar } from "./TivvyAvatar";
import type { ChatMessage, ChatResponse } from "@/types/chat";

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatbotPanel({ isOpen, onClose }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentPath = usePathname();
  const welcomeAudience: ChatbotAudience = currentPath.startsWith("/dashboard/umkm")
    ? "umkm"
    : currentPath.startsWith("/dashboard/kreator")
      ? "creator"
      : "landing";
  const initialSuggestions = getChatbotSuggestions(
    welcomeAudience,
    currentPath,
    [],
    4,
  );
  const visibleSuggestions =
    messages.length === 0 ? initialSuggestions : followUpSuggestions;
  const showSuggestions = shouldShowChatbotSuggestions(
    isLoading,
    visibleSuggestions.length,
  );

  // Follow the conversation, but leave the welcome message in view before the first question.
  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, loadingStage]);

  useEffect(() => {
    if (!isLoading) return;

    const intervalId = window.setInterval(() => {
      setLoadingStage((stage) => Math.min(stage + 1, 2));
    }, 1_800);

    return () => window.clearInterval(intervalId);
  }, [isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    if (messages.length === 0) {
      setFollowUpSuggestions(initialSuggestions);
    }
    setMessages(updatedMessages);
    setInput("");
    setLoadingStage(0);
    setIsLoading(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (currentPath.startsWith("/dashboard/") && !DATA_SOURCE_CONFIG.useMockData) {
        const { jwt } = await account.createJWT({ duration: 300 });
        headers.Authorization = `Bearer ${jwt}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: updatedMessages.slice(-30),
          currentPath,
        }),
      });

      const data = (await response.json()) as Partial<ChatResponse>;

      if (response.ok && typeof data.message === "string") {
        const assistantContent = data.message;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantContent },
        ]);
        setFollowUpSuggestions(
          Array.isArray(data.suggestions)
            ? data.suggestions.filter((item): item is string => typeof item === "string")
            : [],
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Maaf, terjadi kesalahan. Silakan coba lagi dalam beberapa saat. 🙏",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Maaf, tidak dapat terhubung ke server. Periksa koneksi internetmu ya! 🔌",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  return (
    <div
      role="dialog"
      aria-label="Tivvy, asisten AI Marketiv"
      // Closed, the panel stays mounted for its animation, so it is removed from focus and the accessibility tree.
      inert={!isOpen}
      aria-hidden={!isOpen}
      className={cn(
        "chatbot-panel-float",
        // Open and close motion; position and size live in .chatbot-panel-float.
        "origin-bottom-right transition-[opacity,scale,translate] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-95 opacity-0",
      )}
    >
      <div className="halftone relative flex shrink-0 items-center justify-between gap-3 bg-secondary-900 px-5 py-4 text-white [--ht-dir:200deg] [--ht-dot:rgba(249,115,22,0.4)] [--ht-size:8px]">
        <div className="flex items-center gap-3">
          <span className="relative">
            <TivvyAvatar size={44} className="ring-2 ring-white/15" />
            <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-secondary-900" />
          </span>
          <div>
            <h3 className="text-[15px] font-bold leading-tight">Tivvy</h3>
            <p className="text-[12px] text-white/60">Asisten AI Marketiv</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          aria-label="Tutup chatbot"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-100 px-4 py-5 [scrollbar-color:rgba(16,32,51,0.18)_transparent] [scrollbar-width:thin]">
        {messages.length === 0 && (
          <>
            <div className="flex gap-2.5">
              <TivvyAvatar size={30} className="mt-0.5" />
              <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white px-4 py-3 ring-1 ring-secondary-900/[0.06]">
                <p className="text-[14px] leading-relaxed text-secondary-900">{getTivvyWelcomeMessage(welcomeAudience)}</p>
              </div>
            </div>
            {showSuggestions && (
              <div className="pl-10">
                <ChatbotSuggestions questions={visibleSuggestions} disabled={false} onSelect={(question) => void sendMessage(question)} />
              </div>
            )}
          </>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && <TivvyAvatar size={30} className="mt-0.5" />}
            <div
              className={cn(
                "max-w-[85%] overflow-x-auto rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
                msg.role === "user" ? "rounded-tr-md bg-secondary-900 text-white" : "rounded-tl-md bg-white text-secondary-900 ring-1 ring-secondary-900/[0.06]",
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {messages.length > 0 && showSuggestions && (
          <div className="pl-10">
            <ChatbotSuggestions questions={visibleSuggestions} disabled={false} onSelect={(question) => void sendMessage(question)} />
          </div>
        )}

        {isLoading && <ChatbotLoadingState message={getTivvyLoadingMessage(loadingStage)} />}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-secondary-900/[0.06] bg-white px-3 py-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis pertanyaanmu"
          disabled={isLoading}
          aria-label="Pesan untuk Tivvy"
          className="h-11 min-w-0 flex-1 rounded-full bg-neutral-100 px-4 text-[14px] text-secondary-900 outline-none ring-1 ring-secondary-900/[0.06] transition-[box-shadow,background-color] placeholder:text-neutral-500 focus:bg-white focus:ring-2 focus:ring-secondary-900/15 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-900 text-white transition-[background-color,color,scale] hover:bg-primary-500 active:scale-[0.94] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
          aria-label="Kirim pesan"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </div>
  );
}
