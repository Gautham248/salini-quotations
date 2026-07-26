import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";

function fmt(v: number | null | undefined): string {
  return v != null ? v.toFixed(2) : "";
}

export function generatePdfSync(
  q: Record<string, unknown>,
  s: Record<string, unknown> | null
): Buffer {
  const cs = (s || {}) as Record<string, string>;
  const items = (q.lineItems as Array<Record<string, unknown>>) || [];
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = 10;
  const m = 10;

  // Header
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(cs.companyName || "SALINI TRADERS", doc.internal.pageSize.width / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.text(cs.subheading || "", doc.internal.pageSize.width / 2, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Ph:${cs.phone} Mob:${cs.mobile} Email:${cs.email}`, doc.internal.pageSize.width / 2, y, { align: "center" });
  y += 3.5;
  doc.setFont("helvetica", "bold");
  doc.text(`GSTIN: ${cs.gstin}`, doc.internal.pageSize.width / 2, y, { align: "center" });
  y += 5;

  // Quotation title
  doc.setFontSize(10);
  doc.setDrawColor(0);
  doc.rect(m, y, doc.internal.pageSize.width - m * 2, 5);
  doc.text("Quotation", doc.internal.pageSize.width / 2, y + 3.5, { align: "center" });
  y += 7;

  // Customer + meta
  const custName = q.customerName as string || "";
  const custAddr = q.customerAddress as string || "";
  const custPlace = q.customerPlace as string || "";
  const custGstin = q.customerGstin as string || "";
  const dateStr = q.quotDate ? formatDate(new Date(q.quotDate as string)) : "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(custName, m, y);
  y += 3;
  doc.setFont("helvetica", "normal");
  if (custAddr) { doc.text(`Address: ${custAddr}`, m, y); y += 3; }
  if (custPlace) { doc.text(`Place: ${custPlace}`, m, y); y += 3; }
  if (custGstin) { doc.text(`GSTIN: ${custGstin}`, m, y); y += 3; }

  const metaX = 110;
  y = custName ? y - 12 * [custAddr, custPlace, custGstin].filter(Boolean).length : y;
  y = Math.max(y, 35);
  doc.setFont("helvetica", "bold");
  doc.text("Quot. No:", m + 70, y); doc.setFont("helvetica", "normal"); doc.text(`: ${q.quotNo || ""}`, m + 90, y); y += 3;
  doc.setFont("helvetica", "bold"); doc.text("Quot. Date:", m + 70, y); doc.setFont("helvetica", "normal"); doc.text(`: ${dateStr}`, m + 90, y); y += 3;
  doc.setFont("helvetica", "bold"); doc.text("Ref. No:", m + 70, y); doc.setFont("helvetica", "normal"); doc.text(`: ${q.refNo || ""}`, m + 90, y);
  y += 6;

  // Items table
  const columns = [
    { header: "#", dataKey: "sl" },
    { header: "Description of Goods / Service", dataKey: "desc" },
    { header: "GST %", dataKey: "gst" },
    { header: "Qty/Uom", dataKey: "qty" },
    { header: "Rate", dataKey: "rate" },
    { header: "Net Value", dataKey: "net" },
  ];

  const rows = items.map((item, i) => ({
    sl: String(i + 1),
    desc: item.description as string,
    gst: `${item.gstPercent}%`,
    qty: `${item.qty} ${item.unit}`,
    rate: (item.rate as number).toFixed(2),
    net: (item.netValue as number).toFixed(2),
  }));

  const subTotal = q.subTotal as number;
  const cgst = q.cgst as number;
  const sgst = q.sgst as number;
  const roundOff = q.roundOff as number;
  const netAmount = (q.netAmount as number) ?? 0;

  rows.push(
    { sl: "", desc: "", gst: "", qty: "", rate: "Sub Total:", net: fmt(subTotal) },
    { sl: "", desc: "", gst: "", qty: "", rate: "CGST:", net: fmt(cgst) },
    { sl: "", desc: "", gst: "", qty: "", rate: "SGST:", net: fmt(sgst) },
    { sl: "", desc: "", gst: "", qty: "", rate: "Round Off:", net: fmt(roundOff) },
    { sl: "", desc: "", gst: "", qty: "", rate: "Net Amount:", net: netAmount.toFixed(2) }
  );

  autoTable(doc, {
    columns,
    body: rows,
    startY: y,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: 25, halign: "center" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 25, halign: "right" },
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 4 || y + 40;

  // Amount in words
  const words = (q.amountInWords as string) || "";
  doc.setFontSize(7);
  doc.text(`E&OE`, m, y);
  doc.setFont("helvetica", "bold");
  doc.text(words, doc.internal.pageSize.width - m, y, { align: "right" });
  y += 5;

  // Signature + footer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`For ${cs.companyName || "SALINI TRADERS"}`, doc.internal.pageSize.width - m, y, { align: "right" });
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.text("Authorized Signatory", doc.internal.pageSize.width - m, y, { align: "right" });
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(cs.loadingNote || "", m, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`Delivery: ${(q.deliveryTerms as string) || ""}`, m, y);
  doc.text(`Validity: ${(q.validity as string) || "LIMITED"}`, m + 80, y);
  y += 3;
  doc.text(`GST: ${(q.gstNote as string) || ""}`, m, y);
  doc.text(`Payment: ${(q.paymentTerms as string) || "READY PAYMENT"}`, m + 80, y);
  y += 4;
  doc.text(cs.disclaimerText || "", m, y);
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.text(`Bank Details: ${cs.bankDetails || ""}`, m, y);

  return Buffer.from(doc.output("arraybuffer"));
}

export async function generatePdf(
  q: Record<string, unknown>,
  s: Record<string, unknown> | null
): Promise<Buffer> {
  return generatePdfSync(q, s);
}
