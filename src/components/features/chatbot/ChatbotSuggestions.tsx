interface ChatbotSuggestionsProps {
  questions: string[];
  disabled: boolean;
  onSelect: (question: string) => void;
}

export function ChatbotSuggestions({ questions, disabled, onSelect }: ChatbotSuggestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div aria-label="Pertanyaan yang disarankan">
      <p className="text-caption-mono mb-2 text-neutral-500">Pertanyaan cepat</p>
      <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-secondary-900/[0.06]">
        {questions.map((question) => (
          <li key={question} className="border-b border-secondary-900/[0.06] last:border-b-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(question)}
              className="group flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] font-semibold leading-snug text-secondary-900 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex-1">{question}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-neutral-400 transition-[color,translate] group-hover:translate-x-0.5 group-hover:text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h11m-4-5 5 5-5 5" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
