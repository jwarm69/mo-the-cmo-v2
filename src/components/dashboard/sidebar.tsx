"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarClock,
  MessageSquare,
  Megaphone,
  FileText,
  Settings,
  Bot,
  ChevronLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CLIENT_DEFAULT_ORG_NAME } from "@/lib/client-config";
import { useSidebar } from "./sidebar-context";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: CalendarClock },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { mobileOpen, setMobileOpen } = useSidebar();

  const handleNavClick = () => {
    // Close mobile sidebar on navigation
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Bot className="h-8 w-8 shrink-0 text-primary" />
        {(!collapsed || mobileOpen) && (
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight">Mo</span>
            <span className="text-xs text-muted-foreground leading-tight">
              {CLIENT_DEFAULT_ORG_NAME} CMO
            </span>
          </div>
        )}
        {/* Desktop collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "ml-auto h-8 w-8 hidden md:inline-flex",
            collapsed && "ml-0"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
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
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {(!collapsed || mobileOpen) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {(!collapsed || mobileOpen) && (
        <div className="border-t p-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-medium">{CLIENT_DEFAULT_ORG_NAME}</p>
            <p className="text-xs text-muted-foreground">Phase A - Active</p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
