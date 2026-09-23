import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface ProfileCompletionCardProps {
  isProfileCompleted: boolean | undefined;
  href: string;
}

/** Reminder surface driven by AuthProvider's server-evaluated completion flag. */
export function ProfileCompletionCard({
  isProfileCompleted,
  href,
}: ProfileCompletionCardProps) {
  if (isProfileCompleted !== false) return null;

  return (
    <DashboardCard
      variant="soft"
      padding="md"
      className="border border-primary-100 bg-primary-50/50"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
            <CircleAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-text-primary">Profil Belum Lengkap</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Lengkapi profil Anda untuk melanjutkan menggunakan fitur Marketiv.
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 sm:w-auto"
        >
          Lengkapi Profil
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </DashboardCard>
  );
}
