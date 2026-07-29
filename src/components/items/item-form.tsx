"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Tags, X, Plus } from "lucide-react";

interface Unit { id: number; name: string }
interface Category { id: number; name: string }

interface AlternateUnitEntry {
  unitId: number;
  conversionFactor: string;
}

export interface ItemFormData {
  description: string;
  unitId: number;
  rate: string;
  gstPercent: string;
  weightPerUnit: string;
  piecesPerUnit: string;
  categoryIds: number[];
  alternateUnits: AlternateUnitEntry[];
}

const DEFAULT: ItemFormData = {
  description: "",
  unitId: 0,
  rate: "",
  gstPercent: "18",
  weightPerUnit: "",
  piecesPerUnit: "",
  categoryIds: [],
  alternateUnits: [],
};

export function ItemForm({ open, onOpenChange, onSave, initialData, units }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (d: ItemFormData) => void;
  initialData?: ItemFormData | null;
  units: Unit[];
}) {
  const [f, setF] = useState<ItemFormData>(DEFAULT);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newAltUnitId, setNewAltUnitId] = useState<string>("");
  const [newAltFactor, setNewAltFactor] = useState<string>("");

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories);
  }, []);

  useEffect(() => {
    setF(initialData ? { ...DEFAULT, ...initialData } : DEFAULT);
  }, [initialData, open]);

  function toggleCategory(id: number) {
    setF(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter(c => c !== id)
        : [...prev.categoryIds, id],
    }));
  }

  function addAlternateUnit() {
    const uid = parseInt(newAltUnitId);
    const factor = parseFloat(newAltFactor);
    if (!uid || uid <= 0 || !factor || factor <= 0) return;
    if (uid === f.unitId) return;
    if (f.alternateUnits.some(a => a.unitId === uid)) return;
    setF(prev => ({
      ...prev,
      alternateUnits: [...prev.alternateUnits, { unitId: uid, conversionFactor: newAltFactor }],
    }));
    setNewAltUnitId("");
    setNewAltFactor("");
  }

  function removeAlternateUnit(unitId: number) {
    setF(prev => ({
      ...prev,
      alternateUnits: prev.alternateUnits.filter(a => a.unitId !== unitId),
    }));
  }

  const primaryUnit = units.find(u => u.id === f.unitId);
  const availableUnits = units.filter(u =>
    u.id !== f.unitId && !f.alternateUnits.some(a => a.unitId === u.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={e => { e.preventDefault(); onSave(f); onOpenChange(false); }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select
                value={f.unitId ? String(f.unitId) : ""}
                onValueChange={v => setF({ ...f, unitId: v ? parseInt(v) : 0 })}
                items={Object.fromEntries(units.map(u => [String(u.id), u.name]))}
              >
                <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>{units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Weight/Unit (Kg)</Label>
              <Input type="number" step="0.001" min="0" value={f.weightPerUnit} onChange={e => setF({ ...f, weightPerUnit: e.target.value })} placeholder="e.g. 1.2" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pieces per Unit (optional)</Label>
            <Input type="number" min="1" step="1" value={f.piecesPerUnit} onChange={e => setF({ ...f, piecesPerUnit: e.target.value })} placeholder="e.g. 100 if sold by box" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rate (₹) *</Label>
              <Input type="number" step="0.01" min="0" value={f.rate} onChange={e => setF({ ...f, rate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>GST %</Label>
              <Input type="number" step="0.01" min="0" max="100" value={f.gstPercent} onChange={e => setF({ ...f, gstPercent: e.target.value })} required />
            </div>
          </div>

          {/* Alternate Units */}
          <div className="space-y-3 p-3 border rounded-md bg-muted/20">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alternate Units</Label>

            {/* Add row */}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <span className="text-[10px] text-muted-foreground">Unit</span>
                <Select
                  value={newAltUnitId}
                  onValueChange={(v) => setNewAltUnitId(v ?? "")}
                  items={Object.fromEntries(availableUnits.map(u => [String(u.id), u.name]))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {availableUnits.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-1">
                <span className="text-[10px] text-muted-foreground">1 = X {primaryUnit?.name ?? "unit"}</span>
                <Input
                  type="number" step="0.01" min="0.01"
                  value={newAltFactor}
                  onChange={e => setNewAltFactor(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Factor"
                />
              </div>
              <Button
                type="button" variant="outline" size="sm" className="h-8 shrink-0"
                onClick={addAlternateUnit}
                disabled={!newAltUnitId || !newAltFactor || !parseFloat(newAltFactor)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>

            {/* List of added alternate units */}
            {f.alternateUnits.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {f.alternateUnits.map(a => {
                  const u = units.find(uu => uu.id === a.unitId);
                  return (
                    <div key={a.unitId} className="flex items-center justify-between bg-background border rounded px-3 py-1.5 text-xs">
                      <span>
                        <span className="font-medium">{u?.name ?? `Unit #${a.unitId}`}</span>
                        <span className="text-muted-foreground ml-1">= {a.conversionFactor} {primaryUnit?.name ?? "unit"}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAlternateUnit(a.unitId)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category multi-select */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Tags className="h-3.5 w-3.5" />Categories
            </Label>
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">No categories yet — create them via "Manage Categories".</p>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30 max-h-32 overflow-y-auto">
                {categories.map(cat => {
                  const selected = f.categoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                        ${selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:bg-muted"
                        }
                      `}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
            {f.categoryIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {f.categoryIds.map(id => {
                  const cat = categories.find(c => c.id === id);
                  return cat ? <Badge key={id} variant="secondary" className="text-xs">{cat.name}</Badge> : null;
                })}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full">{initialData ? "Save Changes" : "Add Item"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
