"use client";
import { formatDate } from "@/lib/utils";
import { amountInWords } from "@/lib/calculations";
import type { QH } from "./quotation-header-form";
import type { LineItem } from "@/hooks/use-quotation";

export interface StorePreviewSettings {
  companyName: string;
  subheading: string;
  phone: string;
  mobile: string;
  gstin: string;
  bankDetails: string;
  disclaimerText: string;
  loadingNote: string;
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
};

export function QuotationPreview({
  header,
  lineItems,
  totals,
  storeSettings,
  quotNo,
}: {
  header: QH;
  lineItems: LineItem[];
  totals?: { subTotal: number; cgst: number; sgst: number; roundOff: number; netAmount: number; totalGst: number } | null;
  storeSettings?: StorePreviewSettings | null;
  quotNo?: string;
}) {
  const cs = storeSettings || DEFAULT_STORE;
  const displayQuotNo = quotNo || header?.refNo || "-";

  const safeTotals = {
    subTotal: totals?.subTotal ?? 0,
    cgst: totals?.cgst ?? 0,
    sgst: totals?.sgst ?? 0,
    roundOff: totals?.roundOff ?? 0,
    netAmount: totals?.netAmount ?? 0,
  };

  return (
    <div className="border rounded-md bg-white text-black p-4 font-sans text-xs shadow-sm h-full overflow-auto">
      <div className="text-center mb-3">
        <h2 className="text-sm font-bold">{cs.companyName}</h2>
        <p className="text-xs font-bold">{cs.subheading}</p>
        <p className="text-[10px]">Ph: {cs.phone}, Mob: {cs.mobile}</p>
        <p className="text-[11px] font-bold">GSTIN: {cs.gstin}</p>
      </div>
      <div className="text-center font-bold text-xs border border-black py-1 mb-2">Quotation</div>
      <table className="w-full mb-2 text-[11px]">
        <tbody>
          <tr>
            <td className="w-1/2 align-top">
              <strong>{header?.customerName || "(Name)"}</strong>
              {header?.customerAddress && <><br />Address: {header.customerAddress}</>}
              {header?.customerPlace && <><br />Place: {header.customerPlace}</>}
              {header?.customerGstin && <><br />GSTIN: {header.customerGstin}</>}
            </td>
            <td className="w-1/2 align-top">
              <strong>Quot. No</strong>: {displayQuotNo}<br />
              <strong>Date</strong>: {header?.quotDate ? formatDate(new Date(header.quotDate)) : ""}<br />
              <strong>Ref. No</strong>: {header?.refNo}
            </td>
          </tr>
        </tbody>
      </table>
      <table className="w-full border-collapse border border-black text-[10px] mb-2">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-1 text-center w-6">#</th>
            <th className="border border-black p-1 text-left">Description</th>
            <th className="border border-black p-1 text-center w-10">GST</th>
            <th className="border border-black p-1 text-center w-20">Qty/Uom</th>
            <th className="border border-black p-1 text-center w-20">Weight</th>
            <th className="border border-black p-1 text-right w-16">Rate</th>
            <th className="border border-black p-1 text-right w-20">Net Value</th>
          </tr>
        </thead>
        <tbody>
          {(lineItems || []).map((item, i) => (
            <tr key={item.key || i}>
              <td className="border border-black p-1 text-center">{i + 1}</td>
              <td className="border border-black p-1 break-words">{item.description}</td>
              <td className="border border-black p-1 text-center">{item.gstPercent ?? 0}%</td>
              <td className="border border-black p-1 text-center overflow-hidden text-ellipsis whitespace-nowrap">
                {(item.qty ?? 0) > 0 ? `${item.qty} ${item.unit || ""}` : "-"}
              </td>
              <td className="border border-black p-1 text-center overflow-hidden text-ellipsis whitespace-nowrap">
                {item.weightKg != null ? `${item.weightKg} Kg` : "-"}
              </td>
              <td className="border border-black p-1 text-right overflow-hidden text-ellipsis whitespace-nowrap">
                {(item.rate ?? 0).toFixed(2)}
              </td>
              <td className="border border-black p-1 text-right overflow-hidden text-ellipsis whitespace-nowrap">
                {(item.netValue ?? 0).toFixed(2)}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={6} className="border border-black p-1 text-right font-bold">Sub Total:</td>
            <td className="border border-black p-1 text-right">{safeTotals.subTotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-black p-1 text-right font-bold">CGST:</td>
            <td className="border border-black p-1 text-right">{safeTotals.cgst.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-black p-1 text-right font-bold">SGST:</td>
            <td className="border border-black p-1 text-right">{safeTotals.sgst.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-black p-1 text-right font-bold">Round Off:</td>
            <td className="border border-black p-1 text-right">{safeTotals.roundOff.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-black p-1 text-right font-bold">Net Amount</td>
            <td className="border border-black p-1 text-right font-bold">{safeTotals.netAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div className="flex justify-end text-[10px] mb-2">
        <span className="font-bold">{amountInWords(safeTotals.netAmount)}</span>
      </div>
      <div className="text-[10px]">
        <div className="text-right mb-2">
          <p className="font-bold">For {cs.companyName}</p>
          <p>Authorized Signatory</p>
        </div>
        <p className="font-bold">{cs.loadingNote}</p>
        <div className="flex justify-between mt-1">
          <span>Delivery: {header?.deliveryTerms}</span>
          <span>Validity: {header?.validity}</span>
        </div>
        <div className="flex justify-between">
          <span>GST: {header?.gstNote}</span>
          <span>Payment: {header?.paymentTerms}</span>
        </div>
        <p className="mt-1 text-[9px]">{cs.disclaimerText}</p>
        <p className="font-bold text-[9px]">Bank: {cs.bankDetails}</p>
      </div>
    </div>
  );
}
