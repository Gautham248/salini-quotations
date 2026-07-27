"use client";
import { useState } from "react";
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
import { ItemPicker } from "@/components/items/item-picker";
import {
  SquarePlus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  ShieldAlert,
} from "lucide-react";
import { type LineItem } from "@/hooks/use-quotation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function QuotationLineItems({
  lineItems,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  onSyncCatalogItems,
  onSaveDraft,
  onClearDraft,
  readOnly,
}: {
  lineItems: LineItem[];
  onAdd: (i: LineItem) => void;
  onUpdate: (k: string, f: keyof LineItem, v: string | number | boolean | null) => void;
  onRemove: (k: string) => void;
  onMove: (k: string, d: "up" | "down") => void;
  onSyncCatalogItems?: (items: any[]) => void;
  onSaveDraft?: () => void;
  onClearDraft?: () => void;
  readOnly?: boolean;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [lockingItem, setLockingItem] = useState<{
    item: LineItem;
    targetLockState: boolean;
  } | null>(null);

  const confirmLockToggle = () => {
    if (!lockingItem) return;
    const { item, targetLockState } = lockingItem;
    onUpdate(item.key, "isLocked", targetLockState);
    toast.success(
      targetLockState
        ? `"${item.description || "Item"}" locked to staff`
        : `"${item.description || "Item"}" unlocked`
    );
    setLockingItem(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!readOnly && (
          <>
            <ItemPicker
              existingLineItems={lineItems}
              onConfirm={items => {
                if (onSyncCatalogItems) {
                  onSyncCatalogItems(items);
                } else {
                  items.forEach(i => {
                    const calculatedWeight =
                      i.weightPerUnit && i.weightPerUnit > 0 && i.qty > 0
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
                      isLocked: false,
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
                  isLocked: false,
                })
              }
            >
              <SquarePlus className="h-4 w-4 mr-2" />
              Custom Item
            </Button>
          </>
        )}
      </div>

      <div className="border rounded-md overflow-hidden bg-card">
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
              {!readOnly && <TableHead className="w-28 text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? 9 : 10}
                  className="text-center py-8 text-muted-foreground"
                >
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

                const isItemLocked = Boolean(item.isLocked);
                const isFieldDisabled = readOnly || (!isAdmin && isItemLocked);

                return (
                  <TableRow
                    key={item.key}
                    className={cn(isItemLocked && !isAdmin && "bg-amber-500/5")}
                  >
                    <TableCell className="text-center text-sm text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <span>{idx + 1}</span>
                        {isItemLocked && (
                          <span title="Locked by Admin">
                            <Lock className="h-3 w-3 text-amber-600 shrink-0" />
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {readOnly ? (
                        <span className="text-sm">{item.description}</span>
                      ) : (
                        <Input
                          value={item.description}
                          disabled={isFieldDisabled}
                          onChange={e => onUpdate(item.key, "description", e.target.value)}
                          className="h-8 text-sm"
                        />
                      )}
                    </TableCell>

                    <TableCell className="w-16">
                      {readOnly ? (
                        <span className="text-sm">{item.gstPercent}%</span>
                      ) : (
                        <Input
                          type="number"
                          step="0.01"
                          disabled={isFieldDisabled}
                          value={item.gstPercent ?? ""}
                          onChange={e =>
                            onUpdate(
                              item.key,
                              "gstPercent",
                              e.target.value === "" ? 0 : parseFloat(e.target.value)
                            )
                          }
                          className="h-8 text-sm w-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1.5 text-center"
                        />
                      )}
                    </TableCell>

                    <TableCell className="w-20">
                      {modeOptions.length > 1 ? (
                        <select
                          value={item.quoteMode}
                          disabled={isFieldDisabled}
                          onChange={e => onUpdate(item.key, "quoteMode", e.target.value)}
                          className="h-8 text-xs border rounded px-1 disabled:opacity-50"
                        >
                          <option value="quantity">Qty</option>
                          {hasWeight && <option value="weight">Wt</option>}
                          {hasPieces && <option value="pieces">Pcs</option>}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">Qty</span>
                      )}
                    </TableCell>

                    <TableCell className="w-24">
                      {item.quoteMode === "quantity" ? (
                        readOnly ? (
                          <span className="text-sm">{item.qty}</span>
                        ) : (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={isFieldDisabled}
                            value={item.qty ?? ""}
                            onChange={e =>
                              onUpdate(
                                item.key,
                                "qty",
                                e.target.value === "" ? 0 : parseFloat(e.target.value)
                              )
                            }
                            className="h-8 text-sm w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-2 text-center"
                          />
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">(derived)</span>
                      )}
                    </TableCell>

                    <TableCell className="w-28">
                      {readOnly ? (
                        <span className="text-sm">
                          {item.weightKg != null ? `${item.weightKg} Kg` : "-"}
                        </span>
                      ) : (
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="Kg"
                          disabled={isFieldDisabled}
                          value={item.weightKg ?? ""}
                          onChange={e =>
                            onUpdate(
                              item.key,
                              "weightKg",
                              e.target.value === "" ? null : parseFloat(e.target.value)
                            )
                          }
                          className="h-8 text-sm w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-2 text-center"
                        />
                      )}
                    </TableCell>

                    <TableCell className="w-20">
                      {readOnly ? (
                        <span className="text-sm">{item.unit}</span>
                      ) : (
                        <Input
                          value={item.unit}
                          disabled={isFieldDisabled}
                          onChange={e => onUpdate(item.key, "unit", e.target.value)}
                          className="h-8 text-sm w-16 px-2 text-center"
                        />
                      )}
                    </TableCell>

                    <TableCell className="w-28 text-right">
                      {readOnly ? (
                        <span className="text-sm">{item.rate.toFixed(2)}</span>
                      ) : (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isFieldDisabled}
                          value={item.rate ?? ""}
                          onChange={e =>
                            onUpdate(
                              item.key,
                              "rate",
                              e.target.value === "" ? 0 : parseFloat(e.target.value)
                            )
                          }
                          className="h-8 text-sm text-right w-24 ml-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-2"
                        />
                      )}
                    </TableCell>

                    <TableCell className="text-right font-medium text-sm">
                      {item.netValue.toFixed(2)}
                    </TableCell>

                    {!readOnly && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {/* Admin Lock / Unlock Toggle Button */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7 transition-colors",
                                isItemLocked
                                  ? "text-amber-600 hover:text-amber-700 bg-amber-500/10"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() =>
                                setLockingItem({
                                  item,
                                  targetLockState: !isItemLocked,
                                })
                              }
                              title={
                                isItemLocked ? "Unlock item for staff" : "Lock item to staff"
                              }
                            >
                              {isItemLocked ? (
                                <Lock className="h-3.5 w-3.5" />
                              ) : (
                                <Unlock className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isFieldDisabled}
                            className="h-7 w-7"
                            onClick={() => onMove(item.key, "up")}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isFieldDisabled}
                            className="h-7 w-7"
                            onClick={() => onMove(item.key, "down")}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isFieldDisabled}
                            className="h-7 w-7 text-destructive"
                            onClick={() => onRemove(item.key)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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

      {/* Lock / Unlock Confirmation Dialog */}
      <Dialog open={lockingItem !== null} onOpenChange={open => !open && setLockingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 font-semibold mb-1">
              <ShieldAlert className="h-5 w-5" />
              <span>
                {lockingItem?.targetLockState ? "Lock Item to Staff" : "Unlock Item for Staff"}
              </span>
            </div>
            <DialogTitle className="text-base font-medium">
              {lockingItem?.item?.description || "Selected Item"}
            </DialogTitle>
            <DialogDescription className="text-sm pt-2 text-muted-foreground">
              {lockingItem?.targetLockState
                ? "This item will be locked to staff members. Staff will not be able to edit or remove this item from the quotation."
                : "Unlocking this item will allow staff members to edit or remove it from the quotation."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => setLockingItem(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={lockingItem?.targetLockState ? "default" : "secondary"}
              onClick={confirmLockToggle}
            >
              {lockingItem?.targetLockState ? (
                <>
                  <Lock className="h-3.5 w-3.5 mr-1.5" /> Lock Item
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5 mr-1.5" /> Unlock Item
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
