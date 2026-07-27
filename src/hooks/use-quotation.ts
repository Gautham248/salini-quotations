import { useState, useEffect, useRef, useCallback } from "react"; import { computeNetValue, computeTotals } from "@/lib/calculations"; import { toast } from "sonner"; import { isLineItemEffectivelyEmpty } from "@/lib/validation";

export interface LineItem {
  id?: number; key: string; lineNo: number; masterItemId: number | null; description: string;
  unit: string; rate: number; gstPercent: number; qty: number; netValue: number;
  quoteMode: string; weightKg: number | null; weightPerUnit: number | null;
  pieceCount: number | null; piecesPerUnit: number | null;
}
export interface QuotationHeader { customerName: string; customerAddress: string; customerPlace: string; customerGstin: string; quotDate: string; refNo: string; deliveryTerms: string; gstNote: string; validity: string; paymentTerms: string; }
const DH: QuotationHeader = { customerName: "", customerAddress: "", customerPlace: "", customerGstin: "", quotDate: new Date().toISOString().slice(0,10), refNo: "", deliveryTerms: "", gstNote: "", validity: "LIMITED", paymentTerms: "READY PAYMENT" };

function calcNetValue(item: LineItem): number {
  if (item.quoteMode === "weight" && item.weightPerUnit && item.weightPerUnit > 0) {
    return computeNetValue((item.weightKg ?? 0) / item.weightPerUnit, item.rate);
  }
  if (item.quoteMode === "pieces" && item.piecesPerUnit && item.piecesPerUnit > 0) {
    return computeNetValue((item.pieceCount ?? 0) / item.piecesPerUnit, item.rate);
  }
  return computeNetValue(item.qty, item.rate);
}

export function useQuotation(existingId?: number) {
  const [id, setId] = useState<number | undefined>(existingId); const [header, setHeader] = useState(DH); const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true); const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false);
  const dirtiedRef = useRef(false); const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); const itemsRef = useRef(lineItems); const headerRef = useRef(header);
  useEffect(() => { itemsRef.current = lineItems; }, [lineItems]);
  useEffect(() => { headerRef.current = header; }, [header]);
  useEffect(() => { if (existingId) { fetch(`/api/quotations/${existingId}`).then(r => r.json()).then(d => { setHeader({ customerName: d.customerName, customerAddress: d.customerAddress || "", customerPlace: d.customerPlace || "", customerGstin: d.customerGstin || "", quotDate: new Date(d.quotDate).toISOString().slice(0,10), refNo: d.refNo, deliveryTerms: d.deliveryTerms || "", gstNote: d.gstNote || "", validity: d.validity, paymentTerms: d.paymentTerms }); setLineItems(d.lineItems.map((item: Record<string, unknown>) => {
    const mi = item.masterItem as { weightPerUnit?: number | null; piecesPerUnit?: number | null } | null;
    const wpu = mi?.weightPerUnit ?? null;
    const ppu = mi?.piecesPerUnit ?? null;
    const qty = (item.qty as number) || 0;
    const weightKg = item.weightKg != null ? (item.weightKg as number) : (wpu && wpu > 0 ? parseFloat((qty * wpu).toFixed(3)) : null);
    const pieceCount = item.pieceCount != null ? (item.pieceCount as number) : (ppu && ppu > 0 ? Math.round(qty * ppu) : null);
    return {
      id: item.id as number, key: crypto.randomUUID(), lineNo: item.lineNo as number, masterItemId: item.masterItemId as number | null,
      description: item.description as string, unit: item.unit as string, rate: item.rate as number, gstPercent: item.gstPercent as number,
      qty: qty, netValue: item.netValue as number, quoteMode: (item.quoteMode as string) || "quantity",
      weightKg, weightPerUnit: wpu, pieceCount, piecesPerUnit: ppu
    };
  })); setLoading(false); }); } else setLoading(false); }, [existingId]);
  function markDirty() { dirtiedRef.current = true; setDirty(true); }

  const autosave = useCallback(async () => { if (!dirtiedRef.current || saving) return; setSaving(true);
    const saveReq = { ...headerRef.current, quotDate: new Date(headerRef.current.quotDate), lineItems: itemsRef.current.map(i => ({ masterItemId: i.masterItemId, lineNo: i.lineNo, description: i.description, unit: i.unit, rate: i.rate, gstPercent: i.gstPercent, qty: i.qty, netValue: i.netValue, quoteMode: i.quoteMode, weightKg: i.weightKg, pieceCount: i.pieceCount })) };
    try { if (id) { const r = await fetch(`/api/quotations/${id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(saveReq) }); if (r.ok) { dirtiedRef.current = false; setDirty(false); } } else { const r = await fetch("/api/quotations", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(saveReq) }); if (r.ok) { const d = await r.json(); setId(d.id); window.history.replaceState(null, "", `/quotations/${d.id}/edit`); dirtiedRef.current = false; setDirty(false); } } } catch {} finally { setSaving(false); } }, [id, saving]);
  useEffect(() => { if (!dirty) return; if (saveTimerRef.current) clearTimeout(saveTimerRef.current); saveTimerRef.current = setTimeout(autosave, 15000); return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }; }, [dirty, autosave]);

  function updateHeader(f: keyof QuotationHeader, v: string) { setHeader(p => ({ ...p, [f]: v })); markDirty(); }
  function addLineItem(item: LineItem) {
    if (isLineItemEffectivelyEmpty(item)) {
      toast.error("Cannot add an empty item. Please fill in description, quantity, or rate.");
      return;
    }
    if (item.rate < 0) { toast.error("Rate must be non-negative."); return; }
    if (item.qty < 0) { toast.error("Quantity must be non-negative."); return; }
    if (item.gstPercent < 0 || item.gstPercent > 100) { toast.error("GST must be between 0 and 100."); return; }
    const newItem = { ...item, lineNo: lineItems.length + 1 };
    if (newItem.weightKg == null && newItem.weightPerUnit && newItem.weightPerUnit > 0 && newItem.qty > 0) {
      newItem.weightKg = parseFloat((newItem.qty * newItem.weightPerUnit).toFixed(3));
    }
    newItem.netValue = calcNetValue(newItem);
    setLineItems(p => [...p, newItem]); markDirty();
  }
  function updateLineItem(key: string, field: keyof LineItem, value: string | number | null) {
    if (typeof value === "number" && !Number.isFinite(value)) return;
    setLineItems(p => p.map(i => { if (i.key !== key) return i;
      let clamped = value;
      if (field === "qty" && typeof value === "number") clamped = Math.max(0, value);
      if (field === "rate" && typeof value === "number") clamped = Math.max(0, value);
      if (field === "gstPercent" && typeof value === "number") clamped = Math.min(100, Math.max(0, value));
      const u = { ...i, [field]: clamped };
      if (field === "qty" && typeof clamped === "number") {
        if (u.weightPerUnit && u.weightPerUnit > 0) {
          u.weightKg = parseFloat((clamped * u.weightPerUnit).toFixed(3));
        }
        if (u.piecesPerUnit && u.piecesPerUnit > 0) {
          u.pieceCount = Math.round(clamped * u.piecesPerUnit);
        }
      }
      if (field === "weightKg" && typeof clamped === "number" && clamped >= 0) {
        if (u.quoteMode === "weight" && u.weightPerUnit && u.weightPerUnit > 0) {
          u.qty = parseFloat((clamped / u.weightPerUnit).toFixed(2));
        }
      }
      if (field === "qty" || field === "rate" || field === "weightKg" || field === "pieceCount" || field === "quoteMode") {
        u.netValue = calcNetValue(u);
        if (field === "quoteMode" && value === "weight" && u.weightPerUnit && u.weightPerUnit > 0 && !u.weightKg) {
          u.weightKg = parseFloat((u.qty * u.weightPerUnit).toFixed(3));
        }
        if (field === "quoteMode" && value === "pieces" && u.piecesPerUnit && u.piecesPerUnit > 0 && !u.pieceCount) {
          u.pieceCount = Math.round(u.qty * u.piecesPerUnit);
        }
      }
      return u;
    })); markDirty();
  }
  function removeLineItem(key: string) { setLineItems(p => p.filter(i => i.key !== key)); markDirty(); }
  function moveLineItem(key: string, dir: "up"|"down") { setLineItems(p => { const idx = p.findIndex(i => i.key === key); if (idx < 0) return p; const n = dir === "up" ? idx-1 : idx+1; if (n < 0 || n >= p.length) return p; const a = [...p]; [a[idx], a[n]] = [a[n], a[idx]]; return a.map((i, j) => ({ ...i, lineNo: j+1 })); }); markDirty(); }
  
  function syncCatalogItems(selected: {
    masterItemId: number;
    description: string;
    unit: string;
    rate: number;
    gstPercent: number;
    qty: number;
    weightPerUnit: number | null;
    piecesPerUnit: number | null;
  }[]) {
    setLineItems(prev => {
      const customItems = prev.filter(i => i.masterItemId === null);
      const existingCatalogMap = new Map<number, LineItem>();
      prev.filter(i => i.masterItemId !== null).forEach(i => {
        existingCatalogMap.set(i.masterItemId!, i);
      });

      const filtered = selected.filter(sel => (sel.qty || 0) > 0);
      if (filtered.length === 0) {
        toast.error("No items with quantity selected. Add quantity > 0 to include items.");
        return prev;
      }

      const updatedCatalogItems: LineItem[] = filtered.map(sel => {
        const existing = existingCatalogMap.get(sel.masterItemId);
        const qty = sel.qty;
        const wpu = sel.weightPerUnit ?? existing?.weightPerUnit ?? null;
        const ppu = sel.piecesPerUnit ?? existing?.piecesPerUnit ?? null;
        const weightKg = wpu && wpu > 0 ? parseFloat((qty * wpu).toFixed(3)) : null;
        const pieceCount = ppu && ppu > 0 ? Math.round(qty * ppu) : null;
        const netValue = parseFloat((qty * sel.rate).toFixed(2));

        if (existing) {
          return {
            ...existing,
            description: sel.description,
            unit: sel.unit,
            rate: sel.rate,
            gstPercent: sel.gstPercent,
            qty,
            netValue,
            weightKg,
            weightPerUnit: wpu,
            pieceCount,
            piecesPerUnit: ppu,
          };
        } else {
          return {
            key: crypto.randomUUID(),
            lineNo: 0,
            masterItemId: sel.masterItemId,
            description: sel.description,
            unit: sel.unit,
            rate: sel.rate,
            gstPercent: sel.gstPercent,
            qty,
            netValue,
            quoteMode: "quantity",
            weightKg,
            weightPerUnit: wpu,
            pieceCount,
            piecesPerUnit: ppu,
          };
        }
      });

      return [...updatedCatalogItems, ...customItems].map((item, idx) => ({
        ...item,
        lineNo: idx + 1,
      }));
    });
    markDirty();
  }

  const totals = computeTotals(lineItems);
  return { id, header, lineItems, totals, loading, dirty, saving, updateHeader, addLineItem, updateLineItem, removeLineItem, moveLineItem, syncCatalogItems, manualSave: () => autosave() };
}
