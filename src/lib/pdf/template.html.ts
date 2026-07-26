import { formatDate } from "@/lib/utils";

function esc(h: string) { return h.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

export function buildPdfHtml(q: Record<string, unknown>, s: Record<string, unknown> | null): string {
  const cs = (s || {}) as Record<string, string>;
  const ds = q.quotDate ? formatDate(new Date(q.quotDate as string)) : "";
  const items = (q.lineItems as Array<Record<string, unknown>>) || [];
  const linesHtml = items.map((item, i) => `
    <tr><td class="center">${i + 1}</td><td>${esc(item.description as string)}</td><td class="center">${item.gstPercent}%</td><td class="center">${item.qty} ${esc(item.unit as string)}</td><td class="right">${(item.rate as number).toFixed(2)}</td><td class="right">${(item.netValue as number).toFixed(2)}</td></tr>`).join("");

  const totalsHtml = `
    <tr><td colspan="5" class="right bold">Sub Total:</td><td class="right">${(q.subTotal as number)?.toFixed(2) || ""}</td></tr>
    <tr><td colspan="5" class="right bold">CGST:</td><td class="right">${(q.cgst as number)?.toFixed(2) || ""}</td></tr>
    <tr><td colspan="5" class="right bold">SGST:</td><td class="right">${(q.sgst as number)?.toFixed(2) || ""}</td></tr>
    <tr><td colspan="5" class="right bold">Round Off:</td><td class="right">${(q.roundOff as number)?.toFixed(2) || ""}</td></tr>
    <tr><td colspan="5" class="right"><strong>Net Amount:</strong></td><td class="right"><strong>${((q.netAmount as number) ?? 0).toFixed(2)}</strong></td></tr>`;

  const words = (q.amountInWords as string) || "";
  const cn = esc((q.customerName as string) || "");
  const ca = q.customerAddress ? `Address: ${esc(q.customerAddress as string)}<br>` : "";
  const cp = q.customerPlace ? `Place: ${esc(q.customerPlace as string)}<br>` : "";
  const cg = q.customerGstin ? `GSTIN: ${esc(q.customerGstin as string)}` : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>
@page { size: A4 portrait; margin: 12mm 10mm; }
body { font-family: Arial, sans-serif; font-size: 12px; color: #000; line-height: 1.3; }
.header { text-align: center; margin-bottom: 6px; }
.header h1 { font-size: 16px; margin: 0 0 2px; font-weight: bold; }
.header .sub { font-size: 12px; font-weight: bold; }
.header .contact { font-size: 10px; margin: 2px 0; }
.header .gstin { font-size: 11px; font-weight: bold; }
.info-table { width: 100%; margin-bottom: 8px; border-collapse: collapse; }
.info-table td { vertical-align: top; padding: 2px 4px; }
table.items { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
table.items th, table.items td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
table.items th { background: #f5f5f5; font-weight: bold; text-align: center; }
table.items thead { display: table-header-group; }
.right { text-align: right; } .center { text-align: center; } .bold { font-weight: bold; }
.footer { margin-top: 12px; font-size: 10px; }
.quotation-title { text-align: center; font-size: 14px; font-weight: bold; margin: 8px 0; border: 1px solid #000; padding: 4px; }
</style></head><body>
<div class="header"><h1>${esc(cs.companyName || "MARAMATTAM INFRA MART")}</h1><div class="sub">${esc(cs.subheading || "BHARANANGANAM - PALA KOTTAYAM")}</div><div class="contact">Ph:${esc(cs.phone || "9072329100")}, Mob:${esc(cs.mobile || "9072329200")}, EMail:${esc(cs.email || "mtminfra24@gmail.com")}</div><div class="gstin">GSTIN: ${esc(cs.gstin || "32BMBPJ5689L1ZO")}</div></div>
<div class="quotation-title">Quotation</div>
<table class="info-table"><tr><td style="width:55%"><strong>${cn}</strong><br>${ca}${cp}${cg}</td><td style="width:45%"><table style="width:100%"><tr><td style="width:80px"><strong>Quot. No</strong></td><td>: ${esc(q.quotNo as string)}</td></tr><tr><td><strong>Quot. Date</strong></td><td>: ${ds}</td></tr><tr><td><strong>Ref. No</strong></td><td>: ${esc(q.refNo as string)}</td></tr></table></td></tr></table>
<table class="items"><thead><tr><th>#</th><th>Description of Goods / Service</th><th>GST %</th><th>Qty/Uom</th><th>Rate / Discount</th><th>Net Value</th></tr></thead><tbody>${linesHtml}${totalsHtml}</tbody></table>
<table style="width:100%; border-collapse: collapse; margin-bottom: 6px"><tr><td style="width:50%">E&amp;OE</td><td style="width:50%; text-align:right; font-weight:bold">${esc(words)}</td></tr></table>
<div class="footer"><div style="text-align:right; margin-bottom: 16px"><p style="margin:2px 0; font-weight:bold">For ${esc(cs.companyName || "MARAMATTAM INFRA MART")}</p><p style="margin:2px 0">Authorized Signatory</p></div><p style="font-weight:bold">${esc(cs.loadingNote || "LOADING CHARGE AND TRANSPORTATION CHARGES EXTRA")}</p><table style="width:100%; border-collapse: collapse; margin-top: 8px"><tr><td>Delivery: ${esc((q.deliveryTerms as string) || "")}</td><td>Validity: ${esc((q.validity as string) || "LIMITED")}</td></tr><tr><td>GST: ${esc((q.gstNote as string) || "")}</td><td>Payment: ${esc((q.paymentTerms as string) || "READY PAYMENT")}</td></tr></table><p>${esc(cs.disclaimerText || "Certified that the particulars given above are true and correct.")}</p><p style="font-weight:bold">Bank Details : ${esc(cs.bankDetails || "HDFC- BHARANANGANAM- A/C NO: 502000 9419 8674 -IFSC CODE:HDFC 0008448")}</p></div></body></html>`;
}
