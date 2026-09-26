import { Skeleton } from "@/components/ui/skeleton";

export function CampaignSummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-border-soft rounded-[22px] p-4 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CampaignCardSkeleton() {
  return (
    <div className="bg-white border border-border-soft rounded-[28px] p-5 shadow-xs flex flex-col gap-4">
      {/* Thumbnail */}
      <Skeleton className="aspect-video w-full rounded-xl" />
      
      {/* Title & Badge */}
      <div className="flex justify-between items-center gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Brief */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>

      {/* Grid stats */}
      <div className="grid grid-cols-3 gap-2 bg-neutral-50 p-2.5 rounded-xl">
        <Skeleton className="h-7 w-full rounded-md" />
        <Skeleton className="h-7 w-full rounded-md" />
        <Skeleton className="h-7 w-full rounded-md" />
      </div>

      {/* Progress Bars */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Button */}
      <Skeleton className="h-9 w-full rounded-full mt-2" />
    </div>
  );
}

export function CampaignListSkeleton({ viewMode = "card" }: { viewMode?: "card" | "table" }) {
  if (viewMode === "table") {
    return (
      <div className="border border-border-soft rounded-2xl bg-white shadow-xs overflow-hidden">
        <div className="p-4 bg-neutral-50/50 border-b border-border-soft flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        <div className="divide-y divide-border-soft">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-4 items-center">
              <Skeleton className="aspect-video w-14 rounded-lg shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 min-w-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <CampaignCardSkeleton key={i} />
      ))}
    </div>
  );
}
