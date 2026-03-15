"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Check,
  ChevronsUpDown,
  Plus,
  ListOrdered,
  Eye,
  Radio,
  Users,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useSidebar } from "./sidebar-context";
import { useOrg } from "./org-context";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard, group: "overview" },
  // Strategy
  { href: "/channels", label: "Channels", icon: Radio, group: "strategy" },
  { href: "/positioning", label: "Positioning", icon: Users, group: "strategy" },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, group: "strategy" },
  // Execute
  { href: "/plan", label: "Plan", icon: CalendarClock, group: "execute" },
  { href: "/content", label: "Content", icon: FileText, group: "execute" },
  { href: "/queue", label: "Queue", icon: ListOrdered, group: "execute" },
  { href: "/sales", label: "Sales", icon: Briefcase, group: "execute" },
  // Tools
  { href: "/chat", label: "Chat", icon: MessageSquare, group: "tools" },
  { href: "/competitors", label: "Competitors", icon: Eye, group: "tools" },
  { href: "/settings", label: "Settings", icon: Settings, group: "tools" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { activeOrg, orgs, switchOrg } = useOrg();

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
              {activeOrg?.name ?? "Your Brand"} CMO
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
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {(() => {
          const groups = [
            { key: "overview", label: "" },
            { key: "strategy", label: "Strategy" },
            { key: "execute", label: "Execute" },
            { key: "tools", label: "Tools" },
          ];
          return groups.map((group) => {
            const items = navItems.filter((item) => item.group === group.key);
            if (items.length === 0) return null;
            return (
              <div key={group.key}>
                {group.label && (!collapsed || mobileOpen) && (
                  <p className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                )}
                {items.map((item) => {
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
              </div>
            );
          });
        })()}
      </nav>

      {/* Footer — Org Switcher */}
      {(!collapsed || mobileOpen) && (
        <div className="border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg bg-muted p-3 text-left transition-colors hover:bg-muted/80">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {activeOrg?.name ?? "Your Brand"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active Profile
                  </p>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {orgs.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => {
                    if (!org.isActive) {
                      switchOrg(org.id);
                    }
                  }}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{org.name}</span>
                  {org.isActive && (
                    <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/setup")}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Business Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
