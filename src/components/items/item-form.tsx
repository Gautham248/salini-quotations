"use client"; import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input"; import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Unit { id: number; name: string; }
interface IFD { description: string; unitId: number; rate: string; gstPercent: string; category: string; weightPerUnit: string; piecesPerUnit: string; }

export function ItemForm({ open, onOpenChange, onSave, initialData, units }: {
  open: boolean; onOpenChange: (o: boolean) => void; onSave: (d: IFD) => void; initialData?: IFD | null; units: Unit[];
}) {
  const [f, setF] = useState<IFD>({ description: "", unitId: 0, rate: "", gstPercent: "18", category: "", weightPerUnit: "", piecesPerUnit: "" });
  useEffect(() => { setF(initialData || { description: "", unitId: 0, rate: "", gstPercent: "18", category: "", weightPerUnit: "", piecesPerUnit: "" }); }, [initialData, open]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{initialData ? "Edit Item" : "Add Item"}</DialogTitle></DialogHeader>
    <form onSubmit={e => { e.preventDefault(); onSave(f); onOpenChange(false); }} className="space-y-4">
      <div className="space-y-2"><Label>Description *</Label><Input value={f.description} onChange={e => setF({...f, description: e.target.value})} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Unit *</Label>
          <Select value={f.unitId ? String(f.unitId) : ""} onValueChange={v => setF({...f, unitId: v ? parseInt(v) : 0})}>
            <SelectTrigger><SelectValue placeholder="Select unit"/></SelectTrigger>
            <SelectContent>{units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Weight/Unit (Kg)</Label><Input type="number" step="0.001" min="0" value={f.weightPerUnit} onChange={e => setF({...f, weightPerUnit: e.target.value})} placeholder="e.g. 1.2" /></div>
      </div>
      <div className="space-y-2"><Label>Pieces per Unit (optional)</Label><Input type="number" min="1" step="1" value={f.piecesPerUnit} onChange={e => setF({...f, piecesPerUnit: e.target.value})} placeholder="e.g. 100 if sold by the box" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Rate (₹) *</Label><Input type="number" step="0.01" min="0" value={f.rate} onChange={e => setF({...f, rate: e.target.value})} required /></div>
        <div className="space-y-2"><Label>GST %</Label><Input type="number" step="0.01" min="0" max="100" value={f.gstPercent} onChange={e => setF({...f, gstPercent: e.target.value})} required /></div>
      </div>
      <div className="space-y-2"><Label>Category</Label><Input value={f.category} onChange={e => setF({...f, category: e.target.value})} /></div>
      <Button type="submit" className="w-full">{initialData ? "Save" : "Add Item"}</Button>
    </form></DialogContent></Dialog>;
}
