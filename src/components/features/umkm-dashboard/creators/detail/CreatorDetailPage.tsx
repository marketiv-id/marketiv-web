"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getCreatorById, getCreatorRateCards, getCreatorPortfolio, getCreatorSocialAccounts } from "@/services/umkm/umkm-dashboard.service";
import type {
  CreatorProfile,
  CreatorPortfolioItem,
  CreatorSocialAccount,
} from "@/types/umkm-dashboard.types";
import { toCreatorView, toRateCardPackageView, toFollowersLabel } from "../creator.adapter";
import { CreatorProfileHero } from "./CreatorProfileHero";
import { CreatorStatsCards } from "./CreatorStatsCards";
import { RateCardPackagesSection } from "./RateCardPackagesSection";
import { CreatorPortfolioSection } from "./CreatorPortfolioSection";
import { CreatorSocialLinksCard } from "./CreatorSocialLinksCard";
import { CreatorDetailSkeleton } from "./CreatorDetailSkeleton";
import { CreatorNotFoundState } from "./CreatorNotFoundState";
import { CreatorErrorState } from "../CreatorErrorState";
import { StartNegotiationModal } from "../modals/StartNegotiationModal";
import type { RateCardPackage } from "./RateCardPackageCard";

interface CreatorDetailPageProps {
  creatorId: string;
}

export function CreatorDetailPage({ creatorId }: CreatorDetailPageProps) {
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [packages, setPackages] = useState<RateCardPackage[]>([]);
  const [portfolio, setPortfolio] = useState<CreatorPortfolioItem[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<CreatorSocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<RateCardPackage | null>(null);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

  // Fetch nyata lewat facade service (s1-creators).
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const [creatorRes, packagesRes, portfolioRes, socialRes] = await Promise.all([
        getCreatorById(creatorId),
        getCreatorRateCards(creatorId),
        getCreatorPortfolio(creatorId),
        getCreatorSocialAccounts(creatorId),
      ]);

      if (!creatorRes.success || !creatorRes.data) {
        if (creatorRes.code === "not_found") {
          setNotFound(true);
        } else {
          setError(creatorRes.error || "Gagal memuat profil kreator.");
        }
        return;
      }

      setCreator(creatorRes.data);

      if (!packagesRes.success) {
        setPackagesError(packagesRes.error || "Gagal memuat paket rate card.");
        setPackages([]);
      } else {
        setPackagesError(null);
        setPackages((packagesRes.data ?? []).map(toRateCardPackageView));
      }

      if (!portfolioRes.success) {
        setPortfolioError(portfolioRes.error || "Gagal memuat portofolio.");
        setPortfolio([]);
      } else {
        setPortfolioError(null);
        setPortfolio(portfolioRes.data ?? []);
      }

      if (!socialRes.success) {
        setSocialError(socialRes.error || "Gagal memuat akun sosial.");
        setSocialAccounts([]);
      } else {
        setSocialError(null);
        setSocialAccounts(socialRes.data ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <CreatorDetailSkeleton />;
  }

  if (notFound) {
    return <CreatorNotFoundState />;
  }

  if (error) {
    return <CreatorErrorState message={error} onRetry={loadData} />;
  }

  if (!creator) {
    return <CreatorNotFoundState />;
  }

  const creatorView = {
    ...toCreatorView(creator),
    followers: toFollowersLabel(socialAccounts),
  };

  const handleSelectPackage = (pkg: RateCardPackage) => {
    setSelectedPackage(pkg);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/umkm/kreator"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary transition-colors select-none"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Kembali ke Direktori</span>
        </Link>
      </div>

      {/* Profile Identity */}
      <CreatorProfileHero creator={creatorView} />

      {/* Stats Quick Cards */}
      <CreatorStatsCards engagementRate={creator.engagementRate} completedJobs={creator.completedJobs} />

      {/* Rate card packages — dari getCreatorRateCards() */}
      <RateCardPackagesSection
        packages={packages}
        onSelectPackage={handleSelectPackage}
        error={packagesError}
        onRetry={loadData}
      />

      <hr className="border-border-soft" />

      {/* Split details column for Portfolio and Social Links — stretch items to equal heights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main area: Portfolio */}
        <div className="lg:col-span-2 space-y-6">
          <CreatorPortfolioSection
            items={portfolio}
            error={portfolioError}
            onRetry={loadData}
          />
        </div>

        {/* Right side: Social links card */}
        <div className="h-full">
          <CreatorSocialLinksCard
            accounts={socialAccounts}
            error={socialError}
            onRetry={loadData}
          />
        </div>
      </div>

      {/* Negotiation Modal */}
      {selectedPackage && (
        <StartNegotiationModal
          isOpen={!!selectedPackage}
          onClose={() => setSelectedPackage(null)}
          creatorId={creator.id}
          creatorName={creator.name}
          packageId={selectedPackage.id}
          packageName={selectedPackage.name}
          packagePrice={selectedPackage.price}
        />
      )}
    </div>
  );
}
