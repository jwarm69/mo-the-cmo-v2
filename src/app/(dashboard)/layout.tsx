import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { getSessionUser } from "@/lib/api/session";
import { db } from "@/lib/db/client";
import { organizations, userProfiles } from "@/lib/db/schema";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Auto-assign default org if user has no org
  let orgId = user.orgId;
  if (!orgId) {
    const defaultSlug =
      process.env.DEFAULT_ORG_SLUG ??
      process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG ??
      "default-org";

    const orgs = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, defaultSlug))
      .limit(1);

    if (orgs[0]) {
      orgId = orgs[0].id;
      await db
        .update(userProfiles)
        .set({ orgId, updatedAt: new Date() })
        .where(eq(userProfiles.id, user.id));
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={user.email}
          usageLimitCents={user.usageLimitCents}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
