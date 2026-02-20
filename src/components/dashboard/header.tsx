"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, LogOut, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CLIENT_DEFAULT_ORG_NAME } from "@/lib/client-config";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "./sidebar-context";

interface HeaderProps {
  userEmail: string;
  usageLimitCents: number;
}

export function Header({ userEmail, usageLimitCents }: HeaderProps) {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
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
    <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-2">
        {/* Mobile hamburger menu */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={toggleMobile}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-base md:text-lg font-semibold truncate">
          Mo <span className="text-muted-foreground font-normal">—</span>{" "}
          <span className="text-primary">{CLIENT_DEFAULT_ORG_NAME}</span>{" "}
          <span className="hidden sm:inline">CMO</span>
        </h1>
        <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
          Phase A
        </Badge>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="h-4 w-4" />
          <span>AI Status: Active</span>
          <span className="h-2 w-2 rounded-full bg-green-500" />
        </div>
        {/* Mobile: just show the green dot */}
        <span className="h-2 w-2 rounded-full bg-green-500 md:hidden" />
        {usageLimitCents > 0 && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            ${spent} / ${limit}
          </span>
        )}
        <span className="text-sm text-muted-foreground truncate max-w-[100px] sm:max-w-[160px] hidden sm:inline">
          {userEmail}
        </span>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
