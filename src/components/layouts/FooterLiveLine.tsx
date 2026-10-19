"use client";

import { useEffect, useState } from "react";

interface FooterLiveLineProps {
  city: string;
  suffix: string;
}

export function FooterLiveLine({ city, suffix }: FooterLiveLineProps) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const format = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const update = () => setTime(format.format(new Date()));
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  // The clock line only renders once the visitor's browser can supply the time; the sentence is in the server HTML.
  return (
    <div className="max-w-xl">
      <p className="text-caption-mono flex h-4 items-center gap-2 text-white/50">
        {time && (
          <>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
            {city} ·{" "}
            <span key={time} className="inline-block animate-[landing-label-in_0.5s_cubic-bezier(0.16,1,0.3,1)] text-primary-400">
              {time} WIB
            </span>
          </>
        )}
      </p>
      <p className="mt-3 text-lg leading-snug text-white/85 [text-wrap:pretty] md:text-xl">{suffix}</p>
    </div>
  );
}
