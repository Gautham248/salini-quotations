"use client";
import { formatDate } from "@/lib/utils";
import { amountInWords, computeGstExcludedRate, computeLineItemGst } from "@/lib/calculations";
import type { QH } from "./quotation-header-form";
import type { LineItem } from "@/hooks/use-quotation";

export interface StorePreviewSettings {
  companyName: string;
  subheading: string;
  phone: string;
  mobile: string;
  email?: string;
  gstin: string;
  bankDetails: string;
  disclaimerText: string;
  loadingNote: string;
  paymentQrCode?: string | null;
  pan?: string | null;
  declarationText?: string | null;
  jurisdiction?: string | null;
}

const DEFAULT_STORE: StorePreviewSettings = {
  companyName: "SALINI TRADERS",
  subheading: "Pala - Thodupuzha Road, Kanattupura, Pala, Kottayam",
  phone: "+91 9539066366",
  mobile: "+91 9539088488",
  gstin: "32AESFS0236G1Z3",
  bankDetails: "State Bank of India, SME Branch Pala - A/C: 42459778328 - IFSC: SBIN0063661",
  disclaimerText: "Certified that the particulars given above are true and correct.",
  loadingNote: "LOADING CHARGE AND TRANSPORTATION CHARGES EXTRA",
  declarationText: "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
  jurisdiction: "Subject to Pala Jurisdiction",
};

export function formatBankDetailsLines(raw?: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  const text = raw.trim();
  if (text.includes("\n")) {
    return text.split("\n").map(l => l.trim()).filter(Boolean);
  }
  if (text.includes(" - ")) {
    return text.split(" - ").map(l => l.trim()).filter(Boolean);
  }
  if (text.includes(" | ")) {
    return text.split(" | ").map(l => l.trim()).filter(Boolean);
  }
  return [text];
}

export function QuotationPreview({
  header,
  lineItems,
  totals,
  storeSettings,
  quotNo,
}: {
  header: QH;
  lineItems: LineItem[];
  totals?: { subTotal: number; subTotalBeforeTax: number; cgst: number; sgst: number; roundOff: number; netAmount: number; totalGst: number; totalLoadingCharges: number } | null;
  storeSettings?: StorePreviewSettings | null;
  quotNo?: string;
}) {
  const cs = storeSettings || DEFAULT_STORE;
  const displayQuotNo = quotNo || header?.refNo || "-";

  const safeTotals = {
    subTotal: totals?.subTotal ?? 0,
    subTotalBeforeTax: totals?.subTotalBeforeTax ?? 0,
    cgst: totals?.cgst ?? 0,
    sgst: totals?.sgst ?? 0,
    roundOff: totals?.roundOff ?? 0,
    netAmount: totals?.netAmount ?? 0,
    totalLoadingCharges: totals?.totalLoadingCharges ?? 0,
  };

  const hasShipTo = Boolean(header?.shipToName || header?.shipToAddress || header?.shipToPlace);
  const bankLines = formatBankDetailsLines(cs.bankDetails);

  return (
    <div className="border rounded-md bg-white text-black p-4 font-sans text-xs shadow-sm h-full overflow-auto">
      <div className="text-center mb-3">
        <h2 className="text-sm font-bold">{cs.companyName}</h2>
        <p className="text-xs font-bold">{cs.subheading}</p>
        <p className="text-[10px]">
          Ph: {cs.phone}{cs.mobile ? `, Mob: ${cs.mobile}` : ""}{cs.email ? `, Email: ${cs.email}` : ""}
        </p>
        <p className="text-[11px] font-bold">
          GSTIN: {cs.gstin}{cs.pan ? ` | PAN: ${cs.pan}` : ""}
        </p>
      </div>
      <div className="text-center font-bold text-xs border border-black py-1 mb-2">Quotation</div>
      <table className="w-full mb-2 text-[10px] border border-black border-collapse">
        <tbody>
          <tr>
            <td className={`${hasShipTo ? "w-1/3" : "w-1/2"} align-top p-1.5 border-r border-black`}>
              <p className="font-bold text-[9px] uppercase tracking-wider text-gray-700 mb-0.5">Bill To (Buyer)</p>
              <strong>{header?.customerName || "(Name)"}</strong>
              {header?.customerAddress && <><br />Address: {header.customerAddress}</>}
              {header?.customerPlace && <><br />Place: {header.customerPlace}</>}
              {header?.customerGstin && <><br />GSTIN: {header.customerGstin}</>}
              {header?.customerPhone && <><br />Ph: {header.customerPhone}</>}
              {header?.customerEmail && <><br />Email: {header.customerEmail}</>}
            </td>
            {hasShipTo && (
              <td className="w-1/3 align-top p-1.5 border-r border-black">
                <p className="font-bold text-[9px] uppercase tracking-wider text-gray-700 mb-0.5">Ship To (Consignee)</p>
                <strong>{header?.shipToName || "-"}</strong>
                {header?.shipToAddress && <><br />Address: {header.shipToAddress}</>}
                {header?.shipToPlace && <><br />Place: {header.shipToPlace}</>}
                {header?.shipToGstin && <><br />GSTIN: {header.shipToGstin}</>}
              </td>
            )}
            <td className={`${hasShipTo ? "w-1/3" : "w-1/2"} align-top p-1.5`}>
              <strong>Quot. No</strong>: {displayQuotNo}<br />
              <strong>Date</strong>: {header?.quotDate ? formatDate(new Date(header.quotDate)) : ""}<br />
              <strong>Ref. No</strong>: {header?.refNo || "-"}<br />
              {header?.deliveryNote && <><strong>Delivery Note</strong>: {header.deliveryNote}<br /></>}
            </td>
          </tr>
        </tbody>
      </table>
      <table className="w-full border-collapse border border-black text-[10px] mb-2">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-1 text-center w-6">#</th>
            <th className="border border-black p-1 text-left">Description</th>
            <th className="border border-black p-1 text-left w-16">Remark</th>
            <th className="border border-black p-1 text-center w-10">GST</th>
            <th className="border border-black p-1 text-center w-20">Qty</th>
            <th className="border border-black p-1 text-center w-16">Alt Qty</th>
            <th className="border border-black p-1 text-center w-16">Unit</th>
            <th className="border border-black p-1 text-right w-16">Rate</th>
            <th className="border border-black p-1 text-right w-20">Net Value</th>
          </tr>
        </thead>
        <tbody>
          {(lineItems || []).map((item, i) => (
            <tr key={item.key || i}>
              <td className="border border-black p-1 text-center">{i + 1}</td>
              <td className="border border-black p-1 break-words">{item.description}</td>
              <td className="border border-black p-1 break-words text-[9px]">{item.remark || ""}</td>
              <td className="border border-black p-1 text-center">{item.gstPercent ?? 0}%</td>
              <td className="border border-black p-1 text-center overflow-hidden text-ellipsis whitespace-nowrap">
                {(item.qty ?? 0) > 0 ? item.qty : "-"}
              </td>
              <td className="border border-black p-1 text-center overflow-hidden text-ellipsis whitespace-nowrap">
                {item.altQty != null && item.altUnit ? `${item.altQty} ${item.altUnit}` : "-"}
              </td>
              <td className="border border-black p-1 text-center overflow-hidden text-ellipsis whitespace-nowrap">
                {item.unit || "-"}
              </td>
              <td className="border border-black p-1 text-right overflow-hidden text-ellipsis whitespace-nowrap">
                {computeGstExcludedRate(item.rate ?? 0, item.gstPercent ?? 0).toFixed(2)}
              </td>
              <td className="border border-black p-1 text-right overflow-hidden text-ellipsis whitespace-nowrap">
                {(item.netValue ?? 0).toFixed(2)}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={8} className="border border-black p-1 text-right font-bold">Sub Total (taxable):</td>
            <td className="border border-black p-1 text-right">{safeTotals.subTotalBeforeTax.toFixed(2)}</td>
          </tr>
          {safeTotals.totalLoadingCharges > 0 && (
            <tr>
              <td colSpan={8} className="border border-black p-1 text-right font-bold">Loading Charges:</td>
              <td className="border border-black p-1 text-right">{safeTotals.totalLoadingCharges.toFixed(2)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={8} className="border border-black p-1 text-right font-bold">CGST:</td>
            <td className="border border-black p-1 text-right">{safeTotals.cgst.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={8} className="border border-black p-1 text-right font-bold">SGST:</td>
            <td className="border border-black p-1 text-right">{safeTotals.sgst.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={8} className="border border-black p-1 text-right font-bold">Round Off:</td>
            <td className="border border-black p-1 text-right">{safeTotals.roundOff.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={8} className="border border-black p-1 text-right font-bold">Net Amount</td>
            <td className="border border-black p-1 text-right font-bold">{safeTotals.netAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div className="flex justify-between text-[10px] mb-2">
        <span>E&amp;OE</span>
        <span className="font-bold">{amountInWords(safeTotals.netAmount)}</span>
      </div>
      <div className="text-[10px]">
        <div className="text-right mb-2 flex flex-col items-end">
          <p className="font-bold">For {cs.companyName}</p>
          <div className="h-12" /> {/* Space for Seal / Signature */}
          <p className="text-[9px]">Authorized Signatory</p>
        </div>
        <p className="font-bold">{cs.loadingNote}</p>
        {/* Footer: QR on left, terms on right (Option C) */}
        <div className="flex gap-2 mt-1">
          {cs.paymentQrCode && (
            <div className="shrink-0 flex flex-col items-center justify-start gap-0.5">
              <img
                src={cs.paymentQrCode}
                alt="Payment QR Code"
                className="w-[72px] h-[72px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="text-[8px] text-gray-500">Scan to Pay</span>
            </div>
          )}
          <div className="flex-1">
            <div className="flex justify-between">
              <span>Delivery: {header?.deliveryTerms}</span>
              <span>Validity: {header?.validity}</span>
            </div>
            <div className="flex justify-between mt-0.5">
              <span>GST: {header?.gstNote}</span>
              <span>Payment: {header?.paymentTerms}</span>
            </div>
            <p className="mt-1 text-[9px]">{cs.disclaimerText}</p>
            {bankLines.length > 0 && (
              <div className="font-bold text-[9px] mt-0.5">
                {bankLines.map((line, i) => (
                  <p key={i}>
                    {i === 0 && !line.toLowerCase().startsWith("bank") ? `Bank: ${line}` : line}
                  </p>
                ))}
              </div>
            )}
            {cs.declarationText && (
              <p className="mt-1 text-[8px] text-gray-600 italic">
                Declaration: {cs.declarationText}
              </p>
            )}
            <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-gray-200 text-[8px] text-gray-500">
              <span>{cs.jurisdiction || "Subject to Pala Jurisdiction"}</span>
              <span className="font-medium">This is a Computer Generated Invoice/Quotation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
