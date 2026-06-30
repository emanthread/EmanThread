import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProductsLoading() {
  return (
    <div className="space-y-4">
      {/* Header Actions Skeleton */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex w-full sm:w-auto items-center gap-2 flex-wrap">
            <Skeleton className="h-10 w-full sm:w-64" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
             <Skeleton className="h-10 w-32" />
             <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
          <div className="flex items-center gap-2">
             <Skeleton className="h-8 w-24" />
          </div>
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
                    <td className="p-4"><Skeleton className="h-5 w-5" /></td>
                    <td className="p-4 flex items-center gap-3">
                       <Skeleton className="h-10 w-10 rounded-md" />
                       <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-16" />
                       </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></td>
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
