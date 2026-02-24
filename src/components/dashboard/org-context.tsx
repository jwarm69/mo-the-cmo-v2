"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  isActive: boolean;
}

interface OrgContextValue {
  activeOrg: OrgInfo | null;
  orgs: OrgInfo[];
  isLoading: boolean;
  switchOrg: (orgId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue>({
  activeOrg: null,
  orgs: [],
  isLoading: true,
  switchOrg: async () => {},
  refresh: async () => {},
});

export function useOrg() {
  return useContext(OrgContext);
}

interface OrgProviderProps {
  initialActiveOrgId: string | null;
  initialOrgName: string;
  initialOrgSlug: string;
  children: React.ReactNode;
}

export function OrgProvider({
  initialActiveOrgId,
  initialOrgName,
  initialOrgSlug,
  children,
}: OrgProviderProps) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgInfo[]>(() =>
    initialActiveOrgId
      ? [
          {
            id: initialActiveOrgId,
            name: initialOrgName,
            slug: initialOrgSlug,
            role: "owner",
            isActive: true,
          },
        ]
      : []
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/orgs");
      if (!res.ok) return;
      const data = (await res.json()) as {
        activeOrgId: string | null;
        orgs: OrgInfo[];
      };
      setOrgs(data.orgs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const activeOrg = orgs.find((o) => o.isActive) ?? null;

  const switchOrg = useCallback(
    async (orgId: string) => {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) return;
      router.refresh();
      await fetchOrgs();
    },
    [router, fetchOrgs]
  );

  return (
    <OrgContext.Provider
      value={{ activeOrg, orgs, isLoading, switchOrg, refresh: fetchOrgs }}
    >
      {children}
    </OrgContext.Provider>
  );
}
