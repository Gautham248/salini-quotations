"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ItemForm, type ItemFormData } from "./item-form";
import { CategoryManager } from "./category-manager";
import { UnitHoverCard } from "./unit-hover-card";
import { Plus, Search, Pencil, Tags } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface Category {
  id: number;
  name: string;
  _count: { items: number };
}

interface MasterItem {
  id: number;
  description: string;
  unit: { id: number; name: string };
  unitId: number;
  rate: number;
  gstPercent: number;
  weightPerUnit: number | null;
  piecesPerUnit: number | null;
  isActive: boolean;
  categories: { category: Category }[];
  alternateUnits?: Array<{ id: number; unitId: number; unit: { id: number; name: string }; conversionFactor: number }>;
  createdBy?: { username: string };
  updatedBy?: { username: string } | null;
}

interface Unit {
  id: number;
  name: string;
}

export function ItemsTable() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canEdit = role === "admin" || role === "superadmin" || role === "manager";

  const [items, setItems] = useState<MasterItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cf, setCf] = useState("all");
  const [si, setSi] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [catMgrOpen, setCatMgrOpen] = useState(false);
  const [edit, setEdit] = useState<MasterItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (cf !== "all") p.set("categoryId", cf);
    if (si) p.set("showInactive", "true");
    const r = await fetch(`/api/items?${p}`);
    const d = await r.json();
    setItems(d.items ?? []);
    setCategories(d.categories ?? []);
    setLoading(false);
  }, [search, cf, si]);

  const fetchUnits = useCallback(async () => {
    const r = await fetch("/api/units");
    setUnits(await r.json());
  }, []);

  useEffect(() => {
    fetchItems();
    fetchUnits();
  }, [fetchItems, fetchUnits]);

  async function save(d: ItemFormData) {
    const pl = {
      description: d.description,
      unitId: d.unitId,
      rate: parseFloat(d.rate),
      gstPercent: parseFloat(d.gstPercent),
      weightPerUnit: d.weightPerUnit ? parseFloat(d.weightPerUnit) : null,
      piecesPerUnit: d.piecesPerUnit ? parseInt(d.piecesPerUnit) : null,
      categoryIds: d.categoryIds,
      alternateUnits: d.alternateUnits
        .filter(a => a.unitId > 0 && parseFloat(a.conversionFactor) > 0)
        .map(a => ({ unitId: a.unitId, conversionFactor: parseFloat(a.conversionFactor) })),
    };
    if (edit) {
      await fetch(`/api/items/${edit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pl),
      });
      toast.success("Item updated");
    } else {
      await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pl),
      });
      toast.success("Item added");
    }
    setEdit(null);
    fetchItems();
  }

  async function toggle(item: MasterItem) {
    await fetch(`/api/items/${item.id}`, { method: "PATCH" });
    toast.success(item.isActive ? "Item deactivated" : "Item reactivated");
    fetchItems();
  }

  function openEdit(item: MasterItem) {
    setEdit(item);
    setFormOpen(true);
  }

  const editFormData: ItemFormData | null = edit
    ? {
        description: edit.description,
        unitId: edit.unit?.id || 0,
        rate: String(edit.rate),
        gstPercent: String(edit.gstPercent),
        weightPerUnit:
          edit.weightPerUnit != null ? String(edit.weightPerUnit) : "",
        piecesPerUnit:
          edit.piecesPerUnit != null ? String(edit.piecesPerUnit) : "",
        categoryIds: edit.categories.map((c) => c.category.id),
        alternateUnits:
          edit.alternateUnits?.map(a => ({
            unitId: a.unitId,
            conversionFactor: String(a.conversionFactor),
          })) ?? [],
      }
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Master Items
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {items.length} item{items.length !== 1 ? "s" : ""} in catalog
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => setCatMgrOpen(true)}>
                <Tags className="h-4 w-4 mr-1.5" />
                Categories
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEdit(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search items by description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={cf}
            onValueChange={(v) => setCf(v ?? "all")}
            items={{
              all: "All Categories",
              ...Object.fromEntries(categories.map(c => [String(c.id), `${c.name} (${c._count.items})`]))
            }}
          >
            <SelectTrigger className="flex-1 sm:w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} ({c._count.items})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSi(!si)}
            className="shrink-0"
          >
            {si ? "Hide Inactive" : "Show Inactive"}
          </Button>
        </div>
      </div>

      {/* ── Mobile card list (hidden on sm+) ── */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <p className="text-center py-12 text-sm text-muted-foreground">Loading items...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No items found.</p>
            {canEdit && (
              <button onClick={() => { setEdit(null); setFormOpen(true); }} className="text-[13px] text-primary hover:underline mt-1">
                Add your first item
              </button>
            )}
          </div>
        ) : (
          items.map((i) => (
            <Card key={i.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-snug">{i.description}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {i.unit?.name} · ₹{i.rate.toFixed(2)} ({i.gstPercent}%)
                  </p>
                  {i.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {i.categories.slice(0, 2).map((c) => (
                        <Badge key={c.category.id} variant="secondary" className="text-[10px] py-0">{c.category.name}</Badge>
                      ))}
                      {i.categories.length > 2 && <span className="text-[11px] text-muted-foreground">+{i.categories.length - 2}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {i.isActive ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1" />Inactive
                    </Badge>
                  )}
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(i)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch checked={i.isActive} onCheckedChange={() => toggle(i)} />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ── Desktop table (hidden below sm) ── */}
      <Card className="hidden sm:block overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                Unit
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider text-right hidden sm:table-cell">
                Rate (GST%)
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                Wt/Unit
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                Categories
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Active
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                Created By
              </TableHead>
              <TableHead className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                Updated By
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  Loading items...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    No items found.
                  </p>
                  {canEdit && (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1"
                      onClick={() => {
                        setEdit(null);
                        setFormOpen(true);
                      }}
                    >
                      Add your first item
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              items.map((i) => (
                <TableRow
                  key={i.id}
                  className="hover:bg-muted/50"
                >
                  <TableCell className="font-medium text-sm">
                    <div className="flex flex-col">
                      <span>{i.description}</span>
                      <span className="sm:hidden text-[11px] text-muted-foreground mt-0.5">
                        {i.unit?.name}
                        {i.alternateUnits?.length ? ` +${i.alternateUnits.length}` : ""}
                        {" · "}₹{i.rate.toFixed(2)} ({i.gstPercent}%)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm hidden sm:table-cell">
                    <UnitHoverCard
                      primaryUnit={i.unit}
                      alternateUnits={i.alternateUnits}
                      rate={i.rate}
                      description={i.description}
                    />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums hidden sm:table-cell">
                    &#8377;{i.rate.toFixed(2)}{" "}
                    <span className="text-muted-foreground">
                      ({i.gstPercent}%)
                    </span>
                  </TableCell>
                  <TableCell className="text-sm hidden md:table-cell">
                    {i.weightPerUnit != null
                      ? `${i.weightPerUnit} kg`
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {i.categories.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        —
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {i.categories.map((c) => (
                          <Badge
                            key={c.category.id}
                            variant="secondary"
                            className="text-[11px]"
                          >
                            {c.category.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={i.isActive}
                          onCheckedChange={() => toggle(i)}
                        />
                        <span className="text-[12px] text-muted-foreground">
                          {i.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    ) : i.isActive ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-medium flex items-center gap-1.5 w-fit"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-medium flex items-center gap-1.5 w-fit"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                    {i.createdBy?.username || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                    {i.updatedBy?.username || "—"}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(i)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <ItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={save}
        units={units}
        initialData={editFormData}
      />

      <CategoryManager
        open={catMgrOpen}
        onOpenChange={setCatMgrOpen}
        onCategoriesChange={fetchItems}
      />
    </div>
  );
}
