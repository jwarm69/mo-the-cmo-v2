"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, DollarSign, Calendar, Target, Rocket } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  status: string;
  targetAudience: {
    demographics: string;
    psychographics: string;
    painPoints: string[];
    goals: string[];
  } | null;
  pricing: {
    amount: number;
    currency: string;
    model: string;
    description?: string;
  } | null;
  launchDate: string | null;
  uniqueValue: string | null;
  outcomes: string[] | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-gray-500/10 text-gray-700 border-gray-200",
  developing: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  pre_launch: "bg-orange-500/10 text-orange-700 border-orange-200",
  active: "bg-green-500/10 text-green-700 border-green-200",
  sunsetting: "bg-red-500/10 text-red-700 border-red-200",
  archived: "bg-gray-400/10 text-gray-500 border-gray-200",
};

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProductCard({
  product,
  onStatusChange,
  onDelete,
  onLaunchPlan,
}: {
  product: Product;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  onLaunchPlan?: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold truncate pr-2">{product.name}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={STATUS_COLORS[product.status] || ""}
            >
              {product.status.replace("_", " ")}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {product.status === "idea" && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(product.id, "developing")}>
                    Start Developing
                  </DropdownMenuItem>
                )}
                {product.status === "developing" && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(product.id, "pre_launch")}>
                    Move to Pre-Launch
                  </DropdownMenuItem>
                )}
                {product.status === "pre_launch" && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(product.id, "active")}>
                    Launch
                  </DropdownMenuItem>
                )}
                {product.status === "active" && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(product.id, "sunsetting")}>
                    Sunset
                  </DropdownMenuItem>
                )}
                {(product.status === "pre_launch" || product.status === "active") && (
                  <DropdownMenuItem onClick={() => onLaunchPlan?.(product.id)}>
                    <Rocket className="mr-2 h-3 w-3" />
                    Generate Launch Plan
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onStatusChange?.(product.id, "archived")}>
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(product.id)}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}
        {product.uniqueValue && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              <Target className="inline h-3 w-3 mr-1" />
              Value Proposition
            </p>
            <p className="text-sm">{product.uniqueValue}</p>
          </div>
        )}
        {product.outcomes && product.outcomes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.outcomes.slice(0, 3).map((outcome, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {outcome}
              </Badge>
            ))}
            {product.outcomes.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{product.outcomes.length - 3} more
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {product.pricing && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {product.pricing.amount.toLocaleString("en-US", {
                style: "currency",
                currency: product.pricing.currency || "USD",
              })}
              <span className="text-muted-foreground">({product.pricing.model})</span>
            </span>
          )}
          {product.launchDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(product.launchDate)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
