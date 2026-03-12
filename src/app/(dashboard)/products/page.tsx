"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";
import { ProductCard } from "@/components/products/product-card";
import { ProductCreateDialog } from "@/components/products/product-create-dialog";

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        setProducts(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/products`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchProducts();
  };

  const handleLaunchPlan = async (productId: string) => {
    // Navigate to strategy page with launch plan context
    window.location.href = `/strategy?type=launch&productId=${productId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Products & Offers</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            What you sell shapes every marketing decision Mo makes.
          </p>
        </div>
        <ProductCreateDialog onCreated={fetchProducts} />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No products yet</h3>
            <p className="mb-4 text-sm text-muted-foreground text-center max-w-sm">
              Add your products and offers so Mo can build marketing strategies around what you actually sell.
            </p>
            <ProductCreateDialog onCreated={fetchProducts} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onLaunchPlan={handleLaunchPlan}
            />
          ))}
        </div>
      )}
    </div>
  );
}
