"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Tags, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Category { id: number; name: string; _count: { items: number } }

export function CategoryManager({ open, onOpenChange, onCategoriesChange }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCategoriesChange?: () => void;
}) {
  const [cats, setCats] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchCats() {
    const r = await fetch("/api/categories");
    setCats(await r.json());
  }

  useEffect(() => { if (open) fetchCats(); }, [open]);

  async function create() {
    if (!newName.trim()) return;
    setLoading(true);
    const r = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setLoading(false);
    if (r.ok) {
      toast.success(`Category "${newName.trim()}" created`);
      setNewName("");
      await fetchCats();
      onCategoriesChange?.();
    } else {
      toast.error((await r.json()).error || "Failed to create");
    }
  }

  async function save(id: number) {
    if (!editName.trim()) return;
    const r = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (r.ok) {
      toast.success("Renamed");
      setEditId(null);
      await fetchCats();
      onCategoriesChange?.();
    } else {
      toast.error((await r.json()).error || "Failed");
    }
  }

  async function remove(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"? Items will be unlinked but not deleted.`)) return;
    const r = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Deleted");
      await fetchCats();
      onCategoriesChange?.();
    } else {
      toast.error("Failed to delete");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-4 w-4" /> Manage Categories
          </DialogTitle>
        </DialogHeader>

        {/* Create new */}
        <div className="flex gap-2">
          <Input
            placeholder="New category name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && create()}
          />
          <Button onClick={create} disabled={!newName.trim() || loading} size="sm">
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </div>

        {/* List */}
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {cats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No categories yet.</p>
          )}
          {cats.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50">
              {editId === cat.id ? (
                <>
                  <Input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") save(cat.id); if (e.key === "Escape") setEditId(null); }}
                    className="h-7 text-sm flex-1"
                  />
                  <Button size="icon" className="h-7 w-7" onClick={() => save(cat.id)}><Check className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}><X className="h-3 w-3" /></Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                  <Badge variant="secondary" className="text-xs">{cat._count.items} items</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditId(cat.id); setEditName(cat.name); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(cat)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
