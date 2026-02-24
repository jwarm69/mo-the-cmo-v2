import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import { OrgProvider } from "@/components/dashboard/org-context";
import { getSessionUser } from "@/lib/api/session";
import { db } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // If user has no org, send them to setup wizard (unless already there)
  if (!user.orgId) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "";
    if (!pathname.startsWith("/setup")) {
      redirect("/setup");
    }
  }

  // Resolve active org name/slug for initial SSR
  let orgName = "Your Brand";
  let orgSlug = "default-org";
  if (user.orgId) {
    const [org] = await db
      .select({ name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, user.orgId))
      .limit(1);
    if (org) {
      orgName = org.name;
      orgSlug = org.slug;
    }
  }

  return (
    <SidebarProvider>
      <OrgProvider
        initialActiveOrgId={user.orgId}
        initialOrgName={orgName}
        initialOrgSlug={orgSlug}
      >
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header
              userEmail={user.email}
              usageLimitCents={user.usageLimitCents}
            />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </OrgProvider>
    </SidebarProvider>
  );
}
