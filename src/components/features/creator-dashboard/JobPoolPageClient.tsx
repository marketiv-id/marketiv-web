"use client";

import { useCallback, useEffect, useState } from "react";
import { getCreatorJobs } from "@/services/creator/creator-dashboard.service";
import type { CreatorJob } from "@/types/creator-dashboard";
import { JobPoolView } from "./JobPoolView";
import { CreatorPageSkeleton } from "./CreatorPageSkeleton";
import { CreatorErrorState } from "./CreatorErrorState";

/**
 * Client shell untuk route Job Pool (s5-ssr-to-client).
 *
 * Sebelumnya `page.tsx` mengambil data sebagai Server Component. Sesi Appwrite
 * hidup di browser, jadi baca dari server selalu 401 begitu mock dimatikan —
 * pelajaran `s3-ssr-session` yang dulu baru diterapkan ke 4 route.
 */
export function JobPoolPageClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<CreatorJob[]>([]);

  const fetchData = useCallback(async (isActive: () => boolean) => {
    const res = await getCreatorJobs();
    if (!isActive()) return;
    if (!res.success || !res.data) {
      setError(res.error ?? "Gagal memuat Lowongan Kampanye.");
      setLoading(false);
      return;
    }
    setJobs(res.data);
    setLoading(false);
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

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    void fetchData(() => true);
  };

  if (loading) return <CreatorPageSkeleton variant="grid" />;
  if (error) {
    return <CreatorErrorState errorMsg={error} onRetry={handleRetry} />;
  }

  return <JobPoolView initialJobs={jobs} />;
}
