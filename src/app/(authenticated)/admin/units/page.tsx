"use client"; import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input"; import { Label } from "@/components/ui/label"; import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; import { Badge } from "@/components/ui/badge"; import { Plus, Trash2 } from "lucide-react"; import { toast } from "sonner";
interface Unit { id: number; name: string; isActive: boolean; conversionsFrom: { id: number; toUnit: { name: string }; factor: number }[]; }
export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]); const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false); const [convOpen, setConvOpen] = useState(false);
  const [newUnit, setNewUnit] = useState(""); const [convFromId, setConvFromId] = useState<number>(0); const [convToId, setConvToId] = useState<number>(0); const [convFactor, setConvFactor] = useState("");
  const fetchUnits = useCallback(async () => { setLoading(true); const r = await fetch("/api/units"); setUnits(await r.json()); setLoading(false); }, []);
  useEffect(() => { fetchUnits(); }, [fetchUnits]);
  async function addUnit() { if (!newUnit.trim()) return; await fetch("/api/units", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name: newUnit }) }); setNewUnit(""); setAddOpen(false); toast.success("Unit added"); fetchUnits(); }
  async function addConversion() { if (!convFromId || !convToId || !convFactor) return; await fetch("/api/units/conversions", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ fromUnitId: convFromId, toUnitId: convToId, factor: parseFloat(convFactor) }) }); setConvOpen(false); toast.success("Conversion added"); fetchUnits(); }
  async function deleteConversion(id: number) { await fetch(`/api/units/conversions?id=${id}`, { method:"DELETE" }); toast.success("Deleted"); fetchUnits(); }
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Units & Conversions</h1><div className="flex gap-2"><Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2"/>Add Unit</Button><Button variant="outline" onClick={() => setConvOpen(true)}><Plus className="h-4 w-4 mr-2"/>Add Conversion</Button></div></div>
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h2 className="font-semibold mb-2">Units</h2>
        <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Name</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={1} className="text-center py-8">Loading...</TableCell></TableRow> : units.map(u => <TableRow key={u.id}><TableCell>{u.name} {u.conversionsFrom.length > 0 && <span className="text-xs text-muted-foreground ml-2">→ {u.conversionsFrom.map(c => c.toUnit.name).join(", ")}</span>}</TableCell></TableRow>)}</TableBody></Table></div>
      </div>
      <div>
        <h2 className="font-semibold mb-2">Conversions</h2>
        <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Factor</TableHead><TableHead className="w-10"/></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow> : units.flatMap(u => (u.conversionsFrom || []).map(c => <TableRow key={`${u.id}-${c.toUnit.name}`}><TableCell>{u.name}</TableCell><TableCell>{c.toUnit.name}</TableCell><TableCell>{c.factor}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => deleteConversion(c.id)}><Trash2 className="h-3 w-3"/></Button></TableCell></TableRow>))}</TableBody></Table></div>
      </div>
    </div>
    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Add Unit</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Unit Name</Label><Input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="e.g. Sqf, Kg"/></div><Button onClick={addUnit} className="w-full">Add</Button></div></DialogContent></Dialog>
    <Dialog open={convOpen} onOpenChange={setConvOpen}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Add Conversion</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>From</Label><Select value={convFromId ? String(convFromId) : ""} onValueChange={v => setConvFromId(v ? parseInt(v) : 0)}><SelectTrigger><SelectValue placeholder="Select unit"/></SelectTrigger><SelectContent>{units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>To</Label><Select value={convToId ? String(convToId) : ""} onValueChange={v => setConvToId(v ? parseInt(v) : 0)}><SelectTrigger><SelectValue placeholder="Select unit"/></SelectTrigger><SelectContent>{units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Factor (1 from = ? to)</Label><Input type="number" step="0.0001" value={convFactor} onChange={e => setConvFactor(e.target.value)} placeholder="e.g. 0.0929"/></div><Button onClick={addConversion} className="w-full">Add Conversion</Button></div></DialogContent></Dialog>
  </div>;
}
