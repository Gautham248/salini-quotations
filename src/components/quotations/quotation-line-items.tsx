"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ItemPicker } from "@/components/items/item-picker";
import { SquarePlus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { type LineItem } from "@/hooks/use-quotation";

export function QuotationLineItems({
  lineItems, onAdd, onUpdate, onRemove, onMove, onSyncCatalogItems, onSaveDraft, onClearDraft, readOnly,
}: {
  lineItems: LineItem[];
  onAdd: (i: LineItem) => void;
  onUpdate: (k: string, f: keyof LineItem, v: string | number | null) => void;
  onRemove: (k: string) => void;
  onMove: (k: string, d: "up" | "down") => void;
  onSyncCatalogItems?: (items: any[]) => void;
  onSaveDraft?: () => void;
  onClearDraft?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!readOnly && (
          <>
            <ItemPicker
              existingLineItems={lineItems}
              onConfirm={(items) => {
                if (onSyncCatalogItems) {
                  onSyncCatalogItems(items);
                } else {
                  items.forEach((i) => {
                    const calculatedWeight = i.weightPerUnit && i.weightPerUnit > 0 && i.qty > 0
                      ? parseFloat((i.qty * i.weightPerUnit).toFixed(3))
                      : null;
                    onAdd({
                      key: crypto.randomUUID(),
                      lineNo: lineItems.length + 1,
                      masterItemId: i.masterItemId,
                      description: i.description,
                      unit: i.unit,
                      rate: i.rate,
                      gstPercent: i.gstPercent,
                      qty: i.qty,
                      netValue: parseFloat((i.qty * i.rate).toFixed(2)),
                      quoteMode: "quantity",
                      weightKg: calculatedWeight,
                      weightPerUnit: i.weightPerUnit,
                      pieceCount: i.piecesPerUnit ? Math.round(i.qty * i.piecesPerUnit) : null,
                      piecesPerUnit: i.piecesPerUnit,
                    });
                  });
                }
              }}
              onSaveDraft={onSaveDraft ?? (() => {})}
              onClearDraft={onClearDraft ?? (() => {})}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onAdd({
                  key: crypto.randomUUID(),
                  lineNo: lineItems.length + 1,
                  masterItemId: null,
                  description: "",
                  unit: "",
                  rate: 0,
                  gstPercent: 18,
                  qty: 0,
                  netValue: 0,
                  quoteMode: "quantity",
                  weightKg: null,
                  weightPerUnit: null,
                  pieceCount: null,
                  piecesPerUnit: null,
                })
              }
            >
              <SquarePlus className="h-4 w-4 mr-2" />Custom Item
            </Button>
          </>
        )}
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-16">GST%</TableHead>
              <TableHead className="w-20">Mode</TableHead>
              <TableHead className="w-24">Qty</TableHead>
              <TableHead className="w-28">Weight (Kg)</TableHead>
              <TableHead className="w-16">Unit</TableHead>
              <TableHead className="w-24 text-right">Rate</TableHead>
              <TableHead className="w-28 text-right">Net Value</TableHead>
              {!readOnly && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 9 : 10} className="text-center py-8 text-muted-foreground">
                  No items yet.
                </TableCell>
              </TableRow>
            ) : (
              lineItems.map((item, idx) => {
                const hasWeight = !!item.weightPerUnit && item.weightPerUnit > 0;
                const hasPieces = !!item.piecesPerUnit && item.piecesPerUnit > 0;
                const modeOptions: string[] = ["quantity"];
                if (hasWeight) modeOptions.push("weight");
                if (hasPieces) modeOptions.push("pieces");
                return (
                  <TableRow key={item.key}>
                    <TableCell className="text-center text-sm text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      {readOnly ? (
                        <span className="text-sm">{item.description}</span>
                      ) : (
                        <Input value={item.description} onChange={e => onUpdate(item.key, "description", e.target.value)} className="h-8 text-sm" />
                      )}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        <span className="text-sm">{item.gstPercent}%</span>
                      ) : (
                        <Input type="number" step="0.01" value={item.gstPercent} onChange={e => onUpdate(item.key, "gstPercent", parseFloat(e.target.value) || 0)} className="h-8 text-sm w-14" />
                      )}
                    </TableCell>
                    <TableCell>
                      {modeOptions.length > 1 ? (
                        <select value={item.quoteMode} onChange={e => onUpdate(item.key, "quoteMode", e.target.value)} className="h-8 text-xs border rounded px-1">
                          <option value="quantity">Qty</option>
                          {hasWeight && <option value="weight">Wt</option>}
                          {hasPieces && <option value="pieces">Pcs</option>}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">Qty</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.quoteMode === "quantity" ? (
                        readOnly ? (
                          <span className="text-sm">{item.qty}</span>
                        ) : (
                          <Input type="number" step="0.01" min="0" value={item.qty || ""} onChange={e => onUpdate(item.key, "qty", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">(derived)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        <span className="text-sm">{item.weightKg != null ? `${item.weightKg} Kg` : "-"}</span>
                      ) : (
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="Kg"
                          value={item.weightKg ?? ""}
                          onChange={e => onUpdate(item.key, "weightKg", e.target.value === "" ? null : parseFloat(e.target.value))}
                          className="h-8 text-sm w-24"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {readOnly ? (
                        <span className="text-sm">{item.unit}</span>
                      ) : (
                        <Input value={item.unit} onChange={e => onUpdate(item.key, "unit", e.target.value)} className="h-8 text-sm w-16" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {readOnly ? (
                        <span className="text-sm">{item.rate.toFixed(2)}</span>
                      ) : (
                        <Input type="number" step="0.01" min="0" value={item.rate || ""} onChange={e => onUpdate(item.key, "rate", parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">{item.netValue.toFixed(2)}</TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex gap-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(item.key, "up")}><ChevronUp className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(item.key, "down")}><ChevronDown className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(item.key)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
