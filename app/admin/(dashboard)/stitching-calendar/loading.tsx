import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminStitchingCalendarLoading() {
  return (
    <div className="space-y-4">
      {/* Header / Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-60" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Capacity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-7 w-12 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-36" /></CardTitle>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Skeleton key={d} className="h-6 w-full" />
            ))}
          </div>
          {/* Calendar days — 5 rows of 7 */}
          {[...Array(5)].map((_, row) => (
            <div key={row} className="grid grid-cols-7 gap-1 mb-1">
              {[...Array(7)].map((_, col) => (
                <Skeleton key={col} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
