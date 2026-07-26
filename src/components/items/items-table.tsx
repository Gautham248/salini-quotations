"use client"; import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ItemForm } from "./item-form"; import { Plus, Search, Pencil } from "lucide-react"; import { toast } from "sonner";

interface MasterItem { id: number; description: string; unit: { id: number; name: string }; unitId: number; rate: number; gstPercent: number; category: string | null; weightPerUnit: number | null; piecesPerUnit: number | null; isActive: boolean; }
interface Unit { id: number; name: string; }

export function ItemsTable() {
  const [items, setItems] = useState<MasterItem[]>([]); const [cats, setCats] = useState<string[]>([]); const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true); const [search, setSearch] = useState(""); const [cf, setCf] = useState("all"); const [si, setSi] = useState(false);
  const [fo, setFo] = useState(false); const [edit, setEdit] = useState<MasterItem | null>(null);

  const fetchItems = useCallback(async () => { setLoading(true); const p = new URLSearchParams(); if (search) p.set("search", search); if (cf !== "all") p.set("category", cf); if (si) p.set("showInactive", "true");
    const r = await fetch(`/api/items?${p}`); const d = await r.json(); setItems(d.items); setCats(d.categories); setLoading(false); }, [search, cf, si]);
  const fetchUnits = useCallback(async () => { const r = await fetch("/api/units"); setUnits(await r.json()); }, []);
  useEffect(() => { fetchItems(); fetchUnits(); }, [fetchItems, fetchUnits]);

  async function save(d: { description: string; unitId: number; rate: string; gstPercent: string; category: string; weightPerUnit: string; piecesPerUnit: string }) {
    const pl = { description: d.description, unitId: d.unitId, rate: parseFloat(d.rate), gstPercent: parseFloat(d.gstPercent), category: d.category || null, weightPerUnit: d.weightPerUnit ? parseFloat(d.weightPerUnit) : null, piecesPerUnit: d.piecesPerUnit ? parseInt(d.piecesPerUnit) : null };
    if (edit) { await fetch(`/api/items/${edit.id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(pl) }); toast.success("Updated"); }
    else { await fetch("/api/items", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(pl) }); toast.success("Added"); }
    setEdit(null); fetchItems();
  }
  async function toggle(item: MasterItem) { await fetch(`/api/items/${item.id}`, { method: "PATCH" }); toast.success(item.isActive ? "Deactivated" : "Reactivated"); fetchItems(); }

  return <div className="space-y-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Master Items</h1><Button onClick={() => { setEdit(null); setFo(true); }}><Plus className="h-4 w-4 mr-2"/>Add Item</Button></div>
    <div className="flex gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9"/></div>
      <Select value={cf} onValueChange={v => setCf(v ?? "all")}><SelectTrigger className="w-48"><SelectValue placeholder="All categories"/></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{cats.map(c => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}</SelectContent></Select>
      <Button variant="outline" onClick={() => setSi(!si)}>{si ? "Hide inactive" : "Show inactive"}</Button></div>
    <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Rate</TableHead><TableHead>Wt/Unit</TableHead><TableHead>Category</TableHead><TableHead className="w-24">Active</TableHead><TableHead className="w-20"/></TableRow></TableHeader>
      <TableBody>{loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No items.</TableCell></TableRow> : items.map(i => <TableRow key={i.id} className={!i.isActive ? "opacity-50" : ""}><TableCell className="font-medium">{i.description}</TableCell><TableCell>{i.unit?.name}</TableCell><TableCell className="text-right">{i.rate.toFixed(2)} ({i.gstPercent}%)</TableCell><TableCell className="text-right">{i.weightPerUnit != null ? `${i.weightPerUnit} Kg` : "-"}</TableCell><TableCell>{i.category || "-"}</TableCell><TableCell><div className="flex items-center gap-2"><Switch checked={i.isActive} onCheckedChange={() => toggle(i)} /><span className="text-xs text-muted-foreground">{i.isActive ? "Active" : "Inactive"}</span></div></TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => { setEdit(i); setFo(true); }}><Pencil className="h-4 w-4"/></Button></TableCell></TableRow>)}</TableBody></Table></div>
    <ItemForm open={fo} onOpenChange={setFo} onSave={save} units={units} initialData={edit ? { description: edit.description, unitId: edit.unit?.id || 0, rate: String(edit.rate), gstPercent: String(edit.gstPercent), category: edit.category || "", weightPerUnit: edit.weightPerUnit != null ? String(edit.weightPerUnit) : "", piecesPerUnit: edit.piecesPerUnit != null ? String(edit.piecesPerUnit) : "" } : null}/>
  </div>;
}
