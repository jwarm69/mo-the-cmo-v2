"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CLIENT_DEFAULT_ORG_NAME } from "@/lib/client-config";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  userEmail: string;
  usageLimitCents: number;
}

export function Header({ userEmail, usageLimitCents }: HeaderProps) {
  const router = useRouter();
  const [spentCents, setSpentCents] = useState(0);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.spentCents === "number") {
          setSpentCents(data.spentCents);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const spent = (spentCents / 100).toFixed(2);
  const limit = (usageLimitCents / 100).toFixed(2);

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
        {usageLimitCents > 0 && (
          <span className="text-xs text-muted-foreground">
            ${spent} / ${limit}
          </span>
        )}
        <span className="text-sm text-muted-foreground truncate max-w-[160px]">
          {userEmail}
        </span>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
