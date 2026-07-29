"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Unit {
  id: number;
  name: string;
  isActive: boolean;
  conversionsFrom: {
    id: number;
    toUnit: { name: string };
    factor: number;
  }[];
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [convOpen, setConvOpen] = useState(false);
  const [newUnit, setNewUnit] = useState("");
  const [convFromId, setConvFromId] = useState<number>(0);
  const [convToId, setConvToId] = useState<number>(0);
  const [convFactor, setConvFactor] = useState("");

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/units");
    setUnits(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  async function addUnit() {
    if (!newUnit.trim()) return;
    await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newUnit }),
    });
    setNewUnit("");
    setAddOpen(false);
    toast.success("Unit added");
    fetchUnits();
  }

  async function addConversion() {
    if (!convFromId || !convToId || !convFactor) return;
    await fetch("/api/units/conversions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromUnitId: convFromId,
        toUnitId: convToId,
        factor: parseFloat(convFactor),
      }),
    });
    setConvOpen(false);
    toast.success("Conversion added");
    fetchUnits();
  }

  async function deleteConversion(id: number) {
    await fetch(`/api/units/conversions?id=${id}`, { method: "DELETE" });
    toast.success("Conversion deleted");
    fetchUnits();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Units & Conversions
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {units.length} unit{units.length !== 1 ? "s" : ""} defined
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Unit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConvOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Conversion
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Units</h2>
          <Card className="overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Name
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : (
                  units.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <span className="font-medium text-sm">{u.name}</span>
                        {u.conversionsFrom.length > 0 && (
                          <span className="text-[12px] text-muted-foreground ml-2">
                            →{" "}
                            {u.conversionsFrom
                              .map((c) => c.toUnit.name)
                              .join(", ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Conversions</h2>
          <Card className="overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                    From
                  </TableHead>
                  <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                    To
                  </TableHead>
                  <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Factor
                  </TableHead>
                  <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : (
                  units.flatMap((u) =>
                    (u.conversionsFrom || []).map((c) => (
                      <TableRow key={`${u.id}-${c.toUnit.name}`}>
                        <TableCell className="text-sm font-medium">
                          {u.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.toUnit.name}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {c.factor}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => deleteConversion(c.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Unit Name</Label>
              <Input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="e.g. Sqm, Kg"
                onKeyDown={(e) => e.key === "Enter" && addUnit()}
              />
            </div>
            <Button onClick={addUnit} className="w-full">
              Add Unit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={convOpen} onOpenChange={setConvOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Conversion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Select
                value={convFromId ? String(convFromId) : ""}
                onValueChange={(v) => setConvFromId(v ? parseInt(v) : 0)}
                items={Object.fromEntries(units.map((u) => [String(u.id), u.name]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Select
                value={convToId ? String(convToId) : ""}
                onValueChange={(v) => setConvToId(v ? parseInt(v) : 0)}
                items={Object.fromEntries(units.map((u) => [String(u.id), u.name]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Factor (1 from = ? to)</Label>
              <Input
                type="number"
                step="0.0001"
                value={convFactor}
                onChange={(e) => setConvFactor(e.target.value)}
                placeholder="e.g. 0.0929"
              />
            </div>
            <Button onClick={addConversion} className="w-full">
              Add Conversion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
