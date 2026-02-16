"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  FileText,
  BarChart3,
  Palette,
  Settings,
  Bot,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CLIENT_DEFAULT_ORG_NAME } from "@/lib/client-config";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat with Mo", icon: MessageSquare },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/brand", label: "Brand", icon: Palette },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Bot className="h-8 w-8 shrink-0 text-primary" />
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight">Mo</span>
            <span className="text-xs text-muted-foreground leading-tight">
              the CMO
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto h-8 w-8", collapsed && "ml-0")}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t p-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-medium">{CLIENT_DEFAULT_ORG_NAME}</p>
            <p className="text-xs text-muted-foreground">Phase A - Active</p>
          </div>
        </div>
      )}
    </aside>
  );
}
