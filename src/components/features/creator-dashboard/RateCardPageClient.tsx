"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCreatorMetrics,
  getCreatorRateCardPackages,
} from "@/services/creator/creator-dashboard.service";
import type { CreatorRateCardPackage } from "@/types/creator-dashboard";
import { RateCardView } from "./RateCardView";
import { CreatorPageSkeleton } from "./CreatorPageSkeleton";
import { CreatorErrorState } from "./CreatorErrorState";

/**
 * Client shell untuk route rate-card. Baca dipindah dari Server Component ke
 * useEffect (s3-ssr-session): tanpa session bridge SSR, browser SDK 401 saat
 * mock OFF. Pola loading/error/loadData mengikuti CampaignsPage.
 */
export function RateCardPageClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<CreatorRateCardPackage[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);

  /** Ambil data; setState hanya di posisi setelah await. */
  const fetchData = useCallback(async (isActive: () => boolean) => {
    try {
      const [packagesRes, metricsRes] = await Promise.all([
        getCreatorRateCardPackages(),
        getCreatorMetrics(),
      ]);
      if (!isActive()) return;
      if (!packagesRes.success || !packagesRes.data) {
        setError(packagesRes.error ?? "Gagal memuat paket harga.");
        return;
      }
      setPackages(packagesRes.data);
      setOrdersCount(metricsRes.data?.negotiationOrdersCount ?? 0);
    } catch (err) {
      if (!isActive()) return;
      setError(err instanceof Error ? err.message : "Gagal memuat paket harga.");
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await fetchData(() => active);
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  /** Retry dari tombol (event handler — bukan effect body). */
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    void fetchData(() => true);
  };

  if (loading) return <CreatorPageSkeleton showMetrics variant="grid" />;
  if (error) return <CreatorErrorState errorMsg={error} onRetry={handleRetry} />;

  return <RateCardView initialPackages={packages} ordersCount={ordersCount} />;
}
