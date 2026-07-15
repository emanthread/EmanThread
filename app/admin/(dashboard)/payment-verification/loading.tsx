import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPaymentVerificationLoading() {
  return (
    <div className="space-y-4">
      {/* Header Actions Skeleton */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex w-full sm:w-auto items-center gap-2 flex-wrap">
            <Skeleton className="h-10 w-full sm:w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Status Tabs */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>

      {/* Payment Verification Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle><Skeleton className="h-6 w-44" /></CardTitle>
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {[...Array(7)].map((_, i) => (
                    <th key={i} className="text-left p-4">
                      <Skeleton className="h-4 w-full" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(10)].map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-4">
                      {/* Screenshot thumbnail */}
                      <Skeleton className="h-14 w-14 rounded-md" />
                    </td>
                    <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-4">
                      <div className="flex gap-1 justify-end">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </td>
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
