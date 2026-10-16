"use client";

import { useEffect, useState } from "react";

interface FooterLiveLineProps {
  prefix: string;
  city: string;
  suffix: string;
}

export function FooterLiveLine({ prefix, city, suffix }: FooterLiveLineProps) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const format = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const update = () => setTime(format.format(new Date()));
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  // Rendered without the time on the server; the clock only exists once the visitor's browser can supply it.
  return (
    <p className="max-w-xl text-lg leading-snug text-white/80 md:text-xl">
      {time ? (
        <>
          {prefix}{" "}
          <span key={time} className="inline-block animate-[landing-label-in_0.5s_cubic-bezier(0.16,1,0.3,1)] font-mono-nota text-primary-400">
            {time}
          </span>{" "}
          WIB di {city}.{" "}
        </>
      ) : null}
      {suffix}
    </p>
  );
}
