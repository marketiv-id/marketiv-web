"use client";

import { DashboardCard } from "../shared/DashboardCard";

export function TransactionListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Desktop/Tablet Table Skeleton (Hidden on Mobile) */}
      <div className="hidden md:block w-full border border-neutral-200/50 bg-white/70 rounded-2xl overflow-hidden backdrop-blur-md shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-200/50 bg-neutral-50/50 text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
              <th className="px-6 py-4.5">Tanggal</th>
              <th className="px-6 py-4.5">Deskripsi</th>
              <th className="px-6 py-4.5">Jenis Transaksi</th>
              <th className="px-6 py-4.5">Jenis Layanan</th>
              <th className="px-6 py-4.5 text-right">Jumlah</th>
              <th className="px-6 py-4.5">Status</th>
              <th className="px-6 py-4.5 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/40">
            {Array.from({ length: 5 }).map((_, idx) => (
              <tr key={idx} className="hover:bg-neutral-50/20 transition-colors">
                <td className="px-6 py-4.5">
                  <div className="h-3.5 w-16 bg-neutral-200 rounded animate-pulse" />
                </td>
                <td className="px-6 py-4.5">
                  <div className="space-y-1.5">
                    <div className="h-4 w-64 bg-neutral-200 rounded animate-pulse" />
                    <div className="h-2.5 w-24 bg-neutral-200 rounded animate-pulse" />
                  </div>
                </td>
                <td className="px-6 py-4.5">
                  <div className="h-3 w-12 bg-neutral-200 rounded animate-pulse" />
                </td>
                <td className="px-6 py-4.5">
                  <div className="h-3 w-16 bg-neutral-200 rounded animate-pulse" />
                </td>
                <td className="px-6 py-4.5 text-right">
                  <div className="h-4.5 w-20 bg-neutral-200 rounded ml-auto animate-pulse" />
                </td>
                <td className="px-6 py-4.5">
                  <div className="h-5.5 w-24 bg-neutral-200 rounded-full animate-pulse" />
                </td>
                <td className="px-6 py-4.5 text-center">
                  <div className="h-8 w-16 bg-neutral-200 rounded-xl mx-auto animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List Skeleton (Shown only on Mobile) */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <DashboardCard key={idx} variant="default" className="p-4.5 space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-3 w-14 bg-neutral-200 rounded animate-pulse" />
                <div className="h-4 w-11/12 bg-neutral-200 rounded animate-pulse" />
                <div className="h-2.5 w-20 bg-neutral-200 rounded animate-pulse" />
              </div>
              <div className="h-5.5 w-20 bg-neutral-200 rounded-full animate-pulse shrink-0" />
            </div>

            <div className="h-px bg-neutral-200/50" />

            <div className="flex justify-between items-center gap-4">
              <div className="space-y-1">
                <div className="h-2 w-10 bg-neutral-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-neutral-200 rounded-xl animate-pulse" />
            </div>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
