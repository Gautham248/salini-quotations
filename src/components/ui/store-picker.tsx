"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ArrowRight, Loader2 } from "lucide-react";

interface StoreInfo {
  id: number;
  name: string;
  slug: string;
}

interface StorePickerProps {
  onSelect: (storeId: number) => void;
}

export function StorePicker({ onSelect }: StorePickerProps) {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stores")
      .then(r => r.json())
      .then(data => {
        setStores(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-lg mx-auto mt-16">
      <div className="text-center mb-8">
        <h1 className="text-[22px] font-semibold tracking-tight">New Quotation</h1>
        <p className="text-[13px] text-muted-foreground mt-2">
          Select a store to create a quotation for
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No stores available.</p>
          <p className="text-xs mt-1">Create a store first from the Stores panel.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stores.map(store => (
            <Card
              key={store.id}
              className="group hover:border-primary/30 hover:shadow-md transition-all duration-150 cursor-pointer"
              onClick={() => onSelect(store.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors shrink-0">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{store.name}</p>
                    <p className="text-[11px] text-muted-foreground">{store.slug}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
