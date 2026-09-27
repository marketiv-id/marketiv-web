"use client";

import { useCallback, useEffect, useState } from "react";
import { getCreatorJobById } from "@/services/creator/creator-dashboard.service";
import type { CreatorJob } from "@/types/creator-dashboard";
import { JobDetailView } from "./JobDetailView";
import { CreatorPageSkeleton } from "./CreatorPageSkeleton";
import { CreatorErrorState } from "./CreatorErrorState";

/** Client shell untuk detail job (s5-ssr-to-client). */
export function JobDetailPageClient({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<CreatorJob | null>(null);

  const fetchData = useCallback(
    async (isActive: () => boolean) => {
      const res = await getCreatorJobById(jobId);
      if (!isActive()) return;
      // Gagal memuat ≠ campaign tidak ada. Tanpa cabang ini, kegagalan sesi atau
      // jaringan tampil ke kreator sebagai "Kampanye tidak ditemukan".
      if (!res.success && res.code !== "not_found") {
        setError(res.error ?? "Gagal memuat kampanye.");
        setLoading(false);
        return;
      }
      setJob(res.data ?? null);
      setLoading(false);
    },
    [jobId]
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      await fetchData(() => active);
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    void fetchData(() => true);
  };

  if (loading) return <CreatorPageSkeleton showMetrics={false} variant="detail" />;
  if (error) {
    return <CreatorErrorState errorMsg={error} onRetry={handleRetry} />;
  }

  // `job === null` berarti benar-benar tidak ada — JobDetailView yang menangani
  // tampilan "tidak ditemukan".
  return <JobDetailView job={job} />;
}
