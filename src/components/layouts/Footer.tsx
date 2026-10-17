import Image from "next/image";
import Link from "next/link";
import { LANDING_CONTENT, NAVBAR_CONTENT } from "@/data/content";
import { cn } from "@/lib/utils";
import { FooterLiveLine } from "./FooterLiveLine";
import { FooterWordmark } from "./FooterWordmark";

const { footer } = LANDING_CONTENT;

interface FooterProps {
  // On the landing page the footer sits under the last section and is uncovered as that section scrolls away.
  reveal?: boolean;
}

export function Footer({ reveal = false }: FooterProps) {
  return (
    <footer
      className={cn(
        "halftone relative w-full overflow-hidden bg-secondary-900 text-white [--ht-dir:0deg] [--ht-dot:rgba(249,115,22,0.3)]",
        // Reveal only when the whole footer fits the viewport; on short screens a sticky footer would hide its top.
        reveal && "[@media(min-width:1024px)_and_(min-height:900px)]:sticky [@media(min-width:1024px)_and_(min-height:900px)]:bottom-0 [@media(min-width:1024px)_and_(min-height:900px)]:z-0",
      )}
    >
      <div className="mx-auto max-w-[1400px] px-5 pb-6 pt-20 md:px-10 md:pt-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Link href="/" aria-label={NAVBAR_CONTENT.homeLabel} className="inline-flex">
              <Image src="/brand/marketiv-logo.webp" alt="Marketiv" width={545} height={96} className="h-8 w-auto brightness-0 invert" />
            </Link>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">{footer.tagline}</p>
            <div className="mt-10">
              <FooterLiveLine prefix={footer.liveLine.prefix} city={footer.liveLine.city} suffix={footer.liveLine.suffix} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6">
            <div>
              <h2 className="text-[13px] font-semibold text-white/50">{footer.nav.title}</h2>
              <ul className="mt-5 flex flex-col gap-3">
                {footer.nav.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="roll-host inline-flex text-[15px] font-semibold text-white/85 transition-colors hover:text-primary-400">
                      <span className="roll">
                        <span>{link.label}</span>
                        <span aria-hidden="true">{link.label}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-white/50">{footer.legal.title}</h2>
              <ul className="mt-5 flex flex-col gap-3">
                {footer.legal.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[15px] font-semibold text-white/85 transition-colors hover:text-primary-400">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h2 className="text-[13px] font-semibold text-white/50">{footer.contact.title}</h2>
              <ul className="mt-5 flex flex-col gap-3">
                <li>
                  <a href={`mailto:${footer.contact.email}`} className="text-[15px] font-semibold text-white/85 transition-colors hover:text-primary-400">
                    {footer.contact.email}
                  </a>
                </li>
                <li>
                  <a
                    href={footer.contact.instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[15px] font-semibold text-white/85 transition-colors hover:text-primary-400"
                  >
                    Instagram {footer.contact.instagram}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <FooterWordmark text={footer.wordmark} />

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{footer.copyright}</p>
          <p>{footer.program}</p>
        </div>
      </div>
    </footer>
  );
}
