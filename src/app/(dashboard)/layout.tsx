import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { getSessionUser } from "@/lib/api/session";

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
