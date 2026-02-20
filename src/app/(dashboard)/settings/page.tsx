import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage account and integration preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planning</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Weekly cadence and plan generation now live in Plan.
          </p>
          <Link href="/plan">
            <Button variant="outline">Open Plan</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Settings className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Integration settings coming in Sprint 4 (Buffer) and Sprint 7 (Resend).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
