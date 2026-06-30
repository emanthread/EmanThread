import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminMeasurementsLoading() {
  return (
    <div className="space-y-4">
      {/* Header Actions Skeleton */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
             <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="text-left p-4"><Skeleton className="h-4 w-full" /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(10)].map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-4">
                       <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                       </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-24 rounded-md" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-20 rounded-md ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
