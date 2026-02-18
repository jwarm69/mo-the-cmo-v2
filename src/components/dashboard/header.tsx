"use client";

import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CLIENT_DEFAULT_ORG_NAME } from "@/lib/client-config";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">
          Mo <span className="text-muted-foreground font-normal">—</span>{" "}
          <span className="text-primary">{CLIENT_DEFAULT_ORG_NAME}</span> CMO
        </h1>
        <Badge variant="secondary" className="text-xs">
          Phase A
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="h-4 w-4" />
          <span>AI Status: Active</span>
          <span className="h-2 w-2 rounded-full bg-green-500" />
        </div>
      </div>
    </header>
  );
}
