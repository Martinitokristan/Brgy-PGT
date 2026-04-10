export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className}`}
      {...props}
    />
  );
}

export function CommentSkeleton() {
  return (
    <div className="flex gap-2.5 mb-4">
      {/* Avatar */}
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="flex-1 min-w-0">
        {/* Name */}
        <Skeleton className="h-4 w-24 mb-1 rounded-full" />
        {/* Comment text */}
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function CommentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-1 px-4 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      {/* Content skeleton */}
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
