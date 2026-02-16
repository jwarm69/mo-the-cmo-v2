import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">
          Track performance across all your marketing channels.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No analytics data</h3>
          <p className="text-sm text-muted-foreground">
            Analytics dashboards will populate once content starts publishing.
            Coming in Sprint 5.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
