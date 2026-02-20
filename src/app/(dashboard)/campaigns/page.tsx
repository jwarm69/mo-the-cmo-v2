"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { CampaignCreateDialog } from "@/components/campaigns/campaign-create-dialog";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  status: string;
  platforms: string[] | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        setCampaigns(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchCampaigns();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchCampaigns();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Plan and manage multi-channel marketing campaigns.
          </p>
        </div>
        <CampaignCreateDialog onCreated={fetchCampaigns} />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading campaigns...</p>
          </CardContent>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No campaigns yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first campaign or ask Mo to plan one in the chat.
            </p>
            <CampaignCreateDialog onCreated={fetchCampaigns} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onContentGenerated={fetchCampaigns}
            />
          ))}
        </div>
      )}
    </div>
  );
}
