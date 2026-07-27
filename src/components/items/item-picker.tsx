"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingCart, X, Check, PackageOpen, Tags } from "lucide-react";
import { toast } from "sonner";

interface Category { id: number; name: string; _count: { items: number } }
interface MI {
  id: number;
  description: string;
  unit: { id: number; name: string };
  rate: number;
  gstPercent: number;
  weightPerUnit: number | null;
  piecesPerUnit: number | null;
  categories: { category: Category }[];
}
interface SelectedItem {
  masterItemId: number;
  description: string;
  unit: string;
  unitId: number;
  rate: number;
  gstPercent: number;
  weightPerUnit: number | null;
  piecesPerUnit: number | null;
}

interface ItemPickerProps {
  onConfirm: (items: SelectedItem[]) => void;
  onSaveDraft: () => void;
  onClearDraft: () => void;
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>;
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  const pattern = new RegExp(`(${tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <span>
      {parts.map((part, i) =>
        pattern.test(part) ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark> : part
      )}
    </span>
  );
}

export function ItemPicker({ onConfirm, onSaveDraft, onClearDraft }: ItemPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MI[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [selected, setSelected] = useState<Map<number, SelectedItem>>(new Map());
  const [loading, setLoading] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/items")
      .then(r => r.json())
      .then(d => {
        setItems(d.items ?? []);
        setCategories(d.categories ?? []);
      })
      .finally(() => {
        setLoading(false);
        setTimeout(() => searchRef.current?.focus(), 100);
      });
  }, [open]);

  const filtered = useMemo(() => {
    let list = items;
    if (activeCat !== null) {
      list = list.filter(i => i.categories.some(c => c.category.id === activeCat));
    }
    if (search.trim()) {
      const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(i => {
        const desc = i.description.toLowerCase();
        const catNames = i.categories.map(c => c.category.name.toLowerCase()).join(" ");
        return tokens.every(t => desc.includes(t) || catNames.includes(t));
      });
    }
    return list;
  }, [items, search, activeCat]);

  function toggleItem(item: MI) {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, {
          masterItemId: item.id,
          description: item.description,
          unit: item.unit?.name ?? "",
          unitId: item.unit?.id ?? 0,
          rate: item.rate,
          gstPercent: item.gstPercent,
          weightPerUnit: item.weightPerUnit,
          piecesPerUnit: item.piecesPerUnit,
        });
      }
      return next;
    });
  }

  function handleConfirm() {
    if (selected.size === 0) { toast.error("Select at least one item"); return; }
    onConfirm(Array.from(selected.values()));
    setSelected(new Map());
    setOpen(false);
  }

  function handleAttemptClose() {
    if (selected.size > 0) {
      setConfirmClose(true);
    } else {
      setOpen(false);
    }
  }

  function handleSaveDraft() {
    onSaveDraft();
    setConfirmClose(false);
    setSelected(new Map());
    setOpen(false);
  }

  function handleClearAndClose() {
    onClearDraft();
    setConfirmClose(false);
    setSelected(new Map());
    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />Add from Catalog
      </Button>

      {/* ── Main Catalog Modal ─────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={v => { if (!v) handleAttemptClose(); else setOpen(true); }}>
        <DialogContent
          className="max-w-6xl w-[96vw] h-[90vh] p-0 gap-0 flex flex-col"
          showCloseButton={false}
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <PackageOpen className="h-5 w-5 text-primary" />
                Select Items from Catalog
              </DialogTitle>
              <div className="flex items-center gap-3">
                {selected.size > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="font-medium text-foreground">{selected.size}</span> selected
                  </div>
                )}
                <Button onClick={handleConfirm} disabled={selected.size === 0} className="gap-2">
                  <Check className="h-4 w-4" />
                  Add to Quote ({selected.size})
                </Button>
                <Button variant="ghost" size="icon" onClick={handleAttemptClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Search */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchRef}
                placeholder="Search items… (e.g. 'TILE SHEET' or 'RIDGE')"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex flex-1 min-h-0">
            {/* Category Sidebar */}
            <aside className="w-52 flex-shrink-0 border-r overflow-y-auto py-2">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tags className="h-3.5 w-3.5" />Categories
              </p>
              <button
                onClick={() => setActiveCat(null)}
                className={`w-full text-left px-4 py-2 text-sm rounded-none transition-colors ${activeCat === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
              >
                All Items
                <span className="ml-1 text-xs text-muted-foreground">({items.length})</span>
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`w-full text-left px-4 py-2 text-sm rounded-none transition-colors ${activeCat === cat.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
                >
                  {cat.name}
                  <span className="ml-1 text-xs text-muted-foreground">({cat._count.items})</span>
                </button>
              ))}
            </aside>

            {/* Items Grid */}
            <main className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading catalog…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <PackageOpen className="h-10 w-10 opacity-40" />
                  <p className="text-sm">No items match your search.</p>
                  {search && <p className="text-xs">Try fewer words or check spelling.</p>}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map(item => {
                    const isSelected = selected.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item)}
                        className={`
                          relative text-left rounded-xl border-2 p-4 transition-all duration-150 cursor-pointer
                          ${isSelected
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                            : "border-border hover:border-primary/40 hover:bg-muted/50 bg-card"
                          }
                        `}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <p className="font-medium text-sm leading-snug pr-6">
                          {highlight(item.description, search)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          <span className="font-medium text-foreground">₹{item.rate.toFixed(2)}</span>
                          <span className="mx-1">/</span>
                          <span>{item.unit?.name}</span>
                          <span className="mx-1.5">·</span>
                          <span>GST {item.gstPercent}%</span>
                          {item.weightPerUnit != null && (
                            <span className="mx-1.5">· {item.weightPerUnit} Kg/unit</span>
                          )}
                        </p>
                        {item.categories.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.categories.map(c => (
                              <Badge key={c.category.id} variant="secondary" className="text-[10px] h-4 px-1.5">
                                {c.category.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </main>
          </div>

          {/* Selected Summary Bar */}
          {selected.size > 0 && (
            <div className="flex-shrink-0 border-t bg-muted/30 px-6 py-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Selected:</span>
              {Array.from(selected.values()).map(i => (
                <Badge key={i.masterItemId} variant="outline" className="gap-1 text-xs">
                  {i.description}
                  <button onClick={() => setSelected(p => { const n = new Map(p); n.delete(i.masterItemId); return n; })} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Close Confirmation Dialog ─────────────────────────────── */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save before closing?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have {selected.size} item{selected.size !== 1 ? "s" : ""} selected. What would you like to do?
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={handleSaveDraft} className="w-full">
              Save as Draft &amp; Close
            </Button>
            <Button variant="outline" onClick={handleClearAndClose} className="w-full">
              Discard Selection &amp; Close
            </Button>
            <Button variant="ghost" onClick={() => setConfirmClose(false)} className="w-full">
              Continue Selecting
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
