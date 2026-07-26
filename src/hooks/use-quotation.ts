import { useState, useEffect, useRef, useCallback } from "react"; import { computeNetValue, computeTotals } from "@/lib/calculations"; import { toast } from "sonner";

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
  useEffect(() => { if (existingId) { fetch(`/api/quotations/${existingId}`).then(r => r.json()).then(d => { setHeader({ customerName: d.customerName, customerAddress: d.customerAddress || "", customerPlace: d.customerPlace || "", customerGstin: d.customerGstin || "", quotDate: new Date(d.quotDate).toISOString().slice(0,10), refNo: d.refNo, deliveryTerms: d.deliveryTerms || "", gstNote: d.gstNote || "", validity: d.validity, paymentTerms: d.paymentTerms }); setLineItems(d.lineItems.map((item: Record<string, unknown>) => ({ id: item.id as number, key: crypto.randomUUID(), lineNo: item.lineNo as number, masterItemId: item.masterItemId as number | null, description: item.description as string, unit: item.unit as string, rate: item.rate as number, gstPercent: item.gstPercent as number, qty: item.qty as number, netValue: item.netValue as number, quoteMode: (item.quoteMode as string) || "quantity", weightKg: (item.weightKg as number) || null, weightPerUnit: null, pieceCount: (item.pieceCount as number) || null, piecesPerUnit: null }))); setLoading(false); }); } else setLoading(false); }, [existingId]);
  function markDirty() { dirtiedRef.current = true; setDirty(true); }

  const autosave = useCallback(async () => { if (!dirtiedRef.current || saving) return; setSaving(true);
    const saveReq = { ...headerRef.current, quotDate: new Date(headerRef.current.quotDate), lineItems: itemsRef.current.map(i => ({ masterItemId: i.masterItemId, lineNo: i.lineNo, description: i.description, unit: i.unit, rate: i.rate, gstPercent: i.gstPercent, qty: i.qty, netValue: i.netValue, quoteMode: i.quoteMode, weightKg: i.weightKg, pieceCount: i.pieceCount })) };
    try { if (id) { const r = await fetch(`/api/quotations/${id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(saveReq) }); if (r.ok) { dirtiedRef.current = false; setDirty(false); } } else { const r = await fetch("/api/quotations", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(saveReq) }); if (r.ok) { const d = await r.json(); setId(d.id); window.history.replaceState(null, "", `/quotations/${d.id}/edit`); dirtiedRef.current = false; setDirty(false); } } } catch {} finally { setSaving(false); } }, [id, saving]);
  useEffect(() => { if (!dirty) return; if (saveTimerRef.current) clearTimeout(saveTimerRef.current); saveTimerRef.current = setTimeout(autosave, 15000); return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }; }, [dirty, autosave]);

  function updateHeader(f: keyof QuotationHeader, v: string) { setHeader(p => ({ ...p, [f]: v })); markDirty(); }
  function addLineItem(item: LineItem) { setLineItems(p => [...p, { ...item, lineNo: p.length+1, netValue: calcNetValue(item) }]); markDirty(); }
  function updateLineItem(key: string, field: keyof LineItem, value: string | number | null) {
    setLineItems(p => p.map(i => { if (i.key !== key) return i;
      const u = { ...i, [field]: value };
      if (field === "qty" || field === "rate" || field === "weightKg" || field === "pieceCount" || field === "quoteMode") {
        u.netValue = calcNetValue(u);
        if (field === "quoteMode" && value === "weight" && u.weightPerUnit && u.weightPerUnit > 0) u.weightKg = u.qty * u.weightPerUnit;
        if (field === "quoteMode" && value === "pieces" && u.piecesPerUnit && u.piecesPerUnit > 0) u.pieceCount = u.qty * u.piecesPerUnit;
      }
      return u;
    })); markDirty();
  }
  function removeLineItem(key: string) { setLineItems(p => p.filter(i => i.key !== key)); markDirty(); }
  function moveLineItem(key: string, dir: "up"|"down") { setLineItems(p => { const idx = p.findIndex(i => i.key === key); if (idx < 0) return p; const n = dir === "up" ? idx-1 : idx+1; if (n < 0 || n >= p.length) return p; const a = [...p]; [a[idx], a[n]] = [a[n], a[idx]]; return a.map((i, j) => ({ ...i, lineNo: j+1 })); }); markDirty(); }
  const totals = computeTotals(lineItems);
  return { id, header, lineItems, totals, loading, dirty, saving, updateHeader, addLineItem, updateLineItem, removeLineItem, moveLineItem, manualSave: () => autosave() };
}
