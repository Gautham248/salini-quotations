"use client"; import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus } from "lucide-react";

interface MI { id: number; description: string; unit: { id: number; name: string }; weightPerUnit: number | null; piecesPerUnit: number | null; rate: number; gstPercent: number; category: string | null; }

export function ItemPicker({ onSelect }: { onSelect: (i: { masterItemId: number; description: string; unit: string; unitId: number; rate: number; gstPercent: number; weightPerUnit: number | null; piecesPerUnit: number | null; qty: number }) => void }) {
  const [open, setOpen] = useState(false); const [items, setItems] = useState<MI[]>([]); const [search, setSearch] = useState("");
  useEffect(() => { fetch("/api/items").then(r => r.json()).then(d => setItems(d.items)); }, []);
  const filtered = items.filter(i => { if (!search) return true; const s = search.toLowerCase(); return i.description.toLowerCase().includes(s) || (i.category && i.category.toLowerCase().includes(s)); });
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger><Button variant="outline" size="sm" type="button"><Plus className="h-4 w-4 mr-2"/>Add from Catalog</Button></PopoverTrigger>
    <PopoverContent className="w-80 p-0" align="start"><Command><CommandInput placeholder="Search..." value={search} onValueChange={setSearch}/><CommandList><CommandEmpty>No items.</CommandEmpty><CommandGroup>{filtered.slice(0, 50).map(i => <CommandItem key={i.id} onSelect={() => { onSelect({ masterItemId: i.id, description: i.description, unit: i.unit?.name, unitId: i.unit?.id, rate: i.rate, gstPercent: i.gstPercent, weightPerUnit: i.weightPerUnit, piecesPerUnit: i.piecesPerUnit, qty: 0 }); setOpen(false); }}><div className="flex flex-col"><span className="font-medium text-sm">{i.description}</span><span className="text-xs text-muted-foreground">₹{i.rate}/{i.unit?.name} · {i.gstPercent}% {i.weightPerUnit != null ? `· ${i.weightPerUnit}Kg/unit` : ""}{i.piecesPerUnit != null ? ` · ${i.piecesPerUnit}pcs/unit` : ""}</span></div></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover>;
}
