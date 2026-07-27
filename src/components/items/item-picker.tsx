"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, ShoppingCart, X, Check, PackageOpen,
  Tags, Trash2, ChevronRight, LayoutList,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

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

export interface CartItem {
  masterItemId: number;
  description: string;
  unit: string;
  unitId: number;
  rate: number;
  gstPercent: number;
  qty: number;
  weightPerUnit: number | null;
  piecesPerUnit: number | null;
}

export type SelectedItem = CartItem;

interface ItemPickerProps {
  onConfirm: (items: SelectedItem[]) => void;
  onSaveDraft: () => void;
  onClearDraft: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function highlight(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>;
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(pattern);
  return (
    <span>
      {parts.map((part, i) =>
        pattern.test(part)
          ? <mark key={i} className="bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-sm px-0.5 not-italic">{part}</mark>
          : part
      )}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ItemPicker({ onConfirm, onSaveDraft, onClearDraft }: ItemPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MI[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [cart, setCart] = useState<Map<number, CartItem>>(new Map());
  const [loading, setLoading] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load catalog when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/items")
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setCategories(d.categories ?? []); })
      .finally(() => { setLoading(false); setTimeout(() => searchRef.current?.focus(), 80); });
  }, [open]);

  // Fuzzy filter: every search token must appear in description or category name
  const filtered = useMemo(() => {
    let list = items;
    if (activeCat !== null)
      list = list.filter(i => i.categories.some(c => c.category.id === activeCat));
    if (search.trim()) {
      const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(i => {
        const haystack = i.description.toLowerCase() + " " +
          i.categories.map(c => c.category.name.toLowerCase()).join(" ");
        return tokens.every(t => haystack.includes(t));
      });
    }
    return list;
  }, [items, search, activeCat]);

  // ── Cart helpers ────────────────────────────────────────────────────────────

  function toggleItem(item: MI) {
    setCart(prev => {
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
          qty: 1,
          weightPerUnit: item.weightPerUnit,
          piecesPerUnit: item.piecesPerUnit,
        });
      }
      return next;
    });
  }

  function updateCart(id: number, field: keyof CartItem, raw: string) {
    setCart(prev => {
      const next = new Map(prev);
      const it = next.get(id);
      if (!it) return prev;
      const numericFields: (keyof CartItem)[] = ["rate", "gstPercent", "qty"];
      const value = numericFields.includes(field) ? (parseFloat(raw) || 0) : raw;
      next.set(id, { ...it, [field]: value });
      return next;
    });
  }

  function removeFromCart(id: number) {
    setCart(prev => { const n = new Map(prev); n.delete(id); return n; });
  }

  // ── Close & confirm ─────────────────────────────────────────────────────────

  function handleAttemptClose() {
    cart.size > 0 ? setConfirmClose(true) : doClose();
  }

  function doClose() {
    setOpen(false);
    setSearch("");
    setActiveCat(null);
  }

  function handleConfirm() {
    if (cart.size === 0) { toast.error("Add at least one item to the quote"); return; }
    onConfirm(Array.from(cart.values()));
    setCart(new Map());
    doClose();
    toast.success(`${cart.size} item${cart.size !== 1 ? "s" : ""} added to quote`);
  }

  function handleSaveDraft() {
    onSaveDraft();
    setCart(new Map());
    setConfirmClose(false);
    doClose();
  }

  function handleDiscard() {
    onClearDraft();
    setCart(new Map());
    setConfirmClose(false);
    doClose();
  }

  // Derived totals for cart footer
  const cartList = Array.from(cart.values());
  const subtotal = cartList.reduce((s, i) => s + i.qty * i.rate, 0);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Button variant="outline" size="sm" type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />Add from Catalog
      </Button>

      {/* ═══════════════════ MAIN CATALOG MODAL ═══════════════════ */}
      <Dialog open={open} onOpenChange={v => { if (!v) handleAttemptClose(); else setOpen(true); }}>
        <DialogContent
          wide
          className="max-w-[1250px] w-[96vw] h-[90vh] overflow-hidden rounded-2xl border bg-background shadow-2xl"
          showCloseButton={false}
        >
          {/* ── Top Header Bar ── */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b bg-card flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <PackageOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Select Items from Catalog</DialogTitle>
                <p className="text-xs text-muted-foreground">Select master items, adjust quantities/rates, and add to quotation</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleConfirm}
                disabled={cart.size === 0}
                size="sm"
                className="gap-2 px-4 shadow-sm"
              >
                <Check className="h-4 w-4" />
                Add to Quote {cart.size > 0 ? `(${cart.size})` : ""}
              </Button>
              <button
                onClick={handleAttemptClose}
                className="h-8 w-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Three-Pane Body ── */}
          <div className="flex flex-1 min-h-0 divide-x overflow-hidden">

            {/* ─── PANE 1: Categories & Filters ──────────────────────────── */}
            <aside className="w-56 flex-shrink-0 overflow-y-auto bg-muted/20 p-3 flex flex-col gap-2">
              <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tags className="h-3.5 w-3.5" />Categories &amp; Filters
              </p>

              <div className="space-y-1">
                <CategoryBtn
                  label="All Items"
                  count={items.length}
                  active={activeCat === null}
                  onClick={() => setActiveCat(null)}
                />
                {categories.map(cat => (
                  <CategoryBtn
                    key={cat.id}
                    label={cat.name}
                    count={cat._count.items}
                    active={activeCat === cat.id}
                    onClick={() => setActiveCat(cat.id === activeCat ? null : cat.id)}
                  />
                ))}
              </div>
            </aside>

            {/* ─── PANE 2: Master Items List + Search ──────────────────── */}
            <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
              {/* Header with Search */}
              <div className="p-3.5 border-b bg-card/50 flex items-center justify-between gap-4 flex-shrink-0">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  Items <span className="text-xs font-normal text-muted-foreground">({filtered.length})</span>
                </h3>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={searchRef}
                    placeholder="Search items..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-background"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm">Loading catalog...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-16">
                    <PackageOpen className="h-10 w-10 opacity-30" />
                    <p className="text-sm font-medium">No items found</p>
                    {search && <p className="text-xs">Try searching for something else</p>}
                  </div>
                ) : (
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur border-b">
                      <tr className="text-muted-foreground font-semibold">
                        <th className="text-left px-4 py-2.5 font-medium">Item Description</th>
                        <th className="text-left px-3 py-2.5 font-medium w-16">Unit</th>
                        <th className="text-right px-3 py-2.5 font-medium w-20">Rate</th>
                        <th className="text-right px-3 py-2.5 font-medium w-16">GST %</th>
                        <th className="w-12 px-2 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map(item => {
                        const inCart = cart.has(item.id);
                        return (
                          <tr
                            key={item.id}
                            onClick={() => toggleItem(item)}
                            className={`
                              group cursor-pointer transition-colors select-none
                              ${inCart ? "bg-primary/10 hover:bg-primary/15 font-medium" : "hover:bg-muted/50"}
                            `}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-xs ${inCart ? "text-primary font-semibold" : "text-foreground font-medium"}`}>
                                  {highlight(item.description, search)}
                                </span>
                                {item.categories.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {item.categories.map(c => (
                                      <span key={c.category.id} className="text-[10px] bg-muted/80 text-muted-foreground rounded px-1.5 py-0.2">
                                        {c.category.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{item.unit?.name}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold">₹{item.rate.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">{item.gstPercent}%</td>
                            <td className="px-2 py-2.5 text-center">
                              <div className={`
                                h-6 w-6 rounded-full flex items-center justify-center transition-all mx-auto
                                ${inCart
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                                }
                              `}>
                                {inCart ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </main>

            {/* ─── PANE 3: Quote Cart ────────────────────────────────── */}
            <aside className="w-80 flex-shrink-0 flex flex-col bg-muted/10 overflow-hidden">
              {/* Cart header */}
              <div className="px-4 py-3 border-b bg-card flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Quote Items</span>
                  {cart.size > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {cart.size}
                    </span>
                  )}
                </div>
                {cart.size > 0 && (
                  <button
                    onClick={() => setCart(new Map())}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto">
                {cart.size === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-6 py-16">
                    <LayoutList className="h-8 w-8 opacity-30" />
                    <p className="text-sm text-center font-medium">No items yet</p>
                    <p className="text-xs text-center">Click a row in the catalog to add it here</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {cartList.map((item, idx) => {
                      const net = item.qty * item.rate;
                      return (
                        <div key={item.masterItemId} className="px-4 py-3 space-y-2.5">
                          {/* Item name row */}
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground mt-0.5 tabular-nums w-5 flex-shrink-0">
                              {idx + 1}
                            </span>
                            <p className="text-xs font-semibold leading-tight flex-1 min-w-0 pr-1">
                              {item.description}
                            </p>
                            <button
                              onClick={() => removeFromCart(item.masterItemId)}
                              className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Editable fields */}
                          <div className="grid grid-cols-2 gap-1.5 pl-5">
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Qty</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.qty || ""}
                                onChange={e => updateCart(item.masterItemId, "qty", e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className="h-7 text-xs px-2 text-right tabular-nums"
                                placeholder="0"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Unit</span>
                              <Input
                                value={item.unit}
                                onChange={e => updateCart(item.masterItemId, "unit", e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className="h-7 text-xs px-2"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Rate (₹)</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.rate || ""}
                                onChange={e => updateCart(item.masterItemId, "rate", e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className="h-7 text-xs px-2 text-right tabular-nums"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">GST %</span>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={item.gstPercent || ""}
                                onChange={e => updateCart(item.masterItemId, "gstPercent", e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className="h-7 text-xs px-2 text-right tabular-nums"
                              />
                            </label>
                          </div>

                          {/* Net value */}
                          <div className="pl-5 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Net</span>
                            <span className="text-xs font-bold tabular-nums text-foreground">
                              ₹{net.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart footer */}
              {cart.size > 0 && (
                <div className="flex-shrink-0 border-t bg-card px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Subtotal (excl. GST)</span>
                    <span className="text-sm font-bold tabular-nums">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <Button onClick={handleConfirm} className="w-full gap-2" size="sm">
                    <ChevronRight className="h-4 w-4" />
                    Add {cart.size} Item{cart.size !== 1 ? "s" : ""} to Quote
                  </Button>
                </div>
              )}
            </aside>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ CLOSE CONFIRMATION ═══════════════════ */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Close without adding?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have <strong>{cart.size} item{cart.size !== 1 ? "s" : ""}</strong> in your cart. What would you like to do?
          </p>
          <div className="flex flex-col gap-2 mt-1">
            <Button onClick={handleSaveDraft} className="w-full">
              Save Quotation as Draft &amp; Close
            </Button>
            <Button variant="outline" onClick={handleDiscard} className="w-full">
              Discard &amp; Close
            </Button>
            <Button variant="ghost" onClick={() => setConfirmClose(false)} className="w-full">
              Continue Editing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryBtn({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between gap-2 select-none
        ${active
          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
          : "text-foreground hover:bg-muted/80"
        }
      `}
    >
      <span className="truncate">{label}</span>
      <span className={`text-[10px] tabular-nums flex-shrink-0 px-1.5 py-0.2 rounded-full ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {count}
      </span>
    </button>
  );
}
