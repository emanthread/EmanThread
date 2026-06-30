// ── Product Page Loading Skeleton ──────────────────────────────────────────────
// This file is automatically shown by Next.js while the product page is fetching
// data. It appears in < 50ms — long before the DB query completes — so the user
// always sees something immediately instead of a blank white screen.

export default function ProductPageLoading() {
  return (
    <>
      {/* Header placeholder */}
      <div className="h-20 bg-background border-b border-border/50" />

      <main className="min-h-screen pt-20">
        {/* Breadcrumb skeleton */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-10 rounded bg-muted animate-shimmer" />
            <div className="h-4 w-2 rounded bg-muted animate-shimmer" />
            <div className="h-4 w-10 rounded bg-muted animate-shimmer" />
            <div className="h-4 w-2 rounded bg-muted animate-shimmer" />
            <div className="h-4 w-32 rounded bg-muted animate-shimmer" />
          </div>
        </div>

        {/* Main product layout */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">

            {/* Left: Image skeleton with left-to-right shimmer sweep */}
            <div className="space-y-3">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
                <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/40 to-muted animate-[shimmer_1.6s_infinite]" />
              </div>
              {/* Thumbnail row */}
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="relative w-16 h-20 rounded-lg overflow-hidden bg-muted"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/40 to-muted animate-[shimmer_1.6s_infinite]" style={{ animationDelay: `${i * 0.1}s` }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Product info skeleton */}
            <div className="space-y-6 py-4">
              {/* Badge */}
              <div className="h-5 w-16 rounded-full bg-muted animate-shimmer" />

              {/* Product name */}
              <div className="space-y-2">
                <div className="h-8 w-3/4 rounded-lg bg-muted animate-shimmer" />
                <div className="h-8 w-1/2 rounded-lg bg-muted animate-shimmer" style={{ animationDelay: "0.1s" }} />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-4 w-4 rounded bg-muted animate-shimmer" style={{ animationDelay: `${i * 0.05}s` }} />
                  ))}
                </div>
                <div className="h-4 w-16 rounded bg-muted animate-shimmer" />
              </div>

              {/* Price */}
              <div className="h-10 w-36 rounded-lg bg-muted animate-shimmer" />

              {/* Description lines */}
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full rounded bg-muted animate-shimmer" />
                <div className="h-4 w-5/6 rounded bg-muted animate-shimmer" style={{ animationDelay: "0.1s" }} />
                <div className="h-4 w-4/6 rounded bg-muted animate-shimmer" style={{ animationDelay: "0.2s" }} />
              </div>

              {/* Quantity + Add to Cart */}
              <div className="flex gap-3 pt-2">
                <div className="h-12 w-28 rounded-xl bg-muted animate-shimmer" />
                <div className="h-12 flex-1 rounded-xl bg-muted animate-shimmer" style={{ animationDelay: "0.1s" }} />
              </div>

              {/* WhatsApp button */}
              <div className="h-12 w-full rounded-xl bg-muted animate-shimmer" style={{ animationDelay: "0.15s" }} />

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-muted animate-shimmer" />
                    <div className="h-3 w-16 rounded bg-muted animate-shimmer" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-shimmer {
          background: linear-gradient(
            90deg,
            hsl(var(--muted)) 25%,
            hsl(var(--muted) / 0.5) 50%,
            hsl(var(--muted)) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
