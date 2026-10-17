import { TivvyAvatar } from "./TivvyAvatar";

interface ChatbotLoadingStateProps {
  message: string;
}

export function ChatbotLoadingState({ message }: ChatbotLoadingStateProps) {
  return (
    <div className="flex gap-2.5" aria-live="polite" aria-atomic="true">
      <TivvyAvatar size={30} className="mt-0.5" />
      <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 ring-1 ring-secondary-900/[0.06]">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-secondary-900">{message}</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:300ms]" />
          </span>
        </div>
      </div>
    </div>
  );
}
