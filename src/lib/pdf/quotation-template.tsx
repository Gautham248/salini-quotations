import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatDate } from "@/lib/utils";

const BORDER_COLOR = "#000000";
const ACCENT = "#1a3a5c";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: BORDER_COLOR,
  },
  // ── Header ───────────────────────────────────────────────────
  headerCenter: { textAlign: "center", marginBottom: 6 },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: ACCENT },
  subheading: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 2 },
  contactLine: { fontSize: 7, marginTop: 2 },
  gstin: { fontSize: 8, fontFamily: "Helvetica-Bold", marginTop: 2 },
  // ── Quotation title ──────────────────────────────────────────
  quotationBar: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    textAlign: "center",
    paddingVertical: 3,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  // ── Customer info + metadata ─────────────────────────────────
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  customerBlock: { flex: 1 },
  customerName: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  customerDetail: { fontSize: 7, marginTop: 1 },
  metaBlock: { width: 140, alignItems: "flex-end" },
  metaRow: {
    flexDirection: "row",
    marginTop: 2,
    fontSize: 8,
  },
  metaLabel: { fontFamily: "Helvetica-Bold", width: 65, flexShrink: 0 },
  metaValue: { flex: 1, textAlign: "right" },
  // ── Table ────────────────────────────────────────────────────
  table: { marginBottom: 8 },
  tableRow: { flexDirection: "row" },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    fontFamily: "Helvetica-Bold",
  },
  colSl: { width: 20, textAlign: "center" },
  colDesc: { flex: 1 },
  colGst: { width: 35, textAlign: "center" },
  colQty: { width: 60, textAlign: "center" },
  colWeight: { width: 50, textAlign: "center" },
  colRate: { width: 55, textAlign: "right" },
  colNet: { width: 60, textAlign: "right" },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 3,
    paddingVertical: 2,
    fontSize: 7,
  },
  cellLeft: {
    borderLeftWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cellTop: {
    borderTopWidth: 1,
    borderColor: BORDER_COLOR,
  },
  headerCell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 3,
    paddingVertical: 3,
    fontSize: 7,
  },
  headerCellLeft: {
    borderLeftWidth: 1,
    borderColor: BORDER_COLOR,
  },
  totalsLabel: {
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  totalsValue: {
    textAlign: "right",
  },
  // ── Seal / signature space ───────────────────────────────────
  sealSpacer: { height: 55 },
  amountInWords: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  footer: { marginTop: 10, fontSize: 7 },
  signature: {
    textAlign: "right",
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  signatory: { fontSize: 7, marginTop: 1, fontFamily: "Helvetica" },
  loadingNote: { fontFamily: "Helvetica-Bold", fontSize: 7, marginBottom: 4 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    fontSize: 7,
  },
  disclaimer: { fontSize: 6, marginTop: 4 },
  bankDetails: { fontSize: 6, fontFamily: "Helvetica-Bold", marginTop: 2 },
});

interface LineItem {
  description: string;
  gstPercent: number;
  qty: number;
  unit: string;
  weightKg: number | null;
  rate: number;
  netValue: number;
}

interface QuotationData {
  quotNo: string;
  refNo: string;
  quotDate: string;
  customerName: string;
  customerAddress: string | null;
  customerPlace: string | null;
  customerGstin: string | null;
  deliveryTerms: string | null;
  gstNote: string | null;
  validity: string;
  paymentTerms: string;
  lineItems: LineItem[];
  subTotal: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  netAmount: number;
  amountInWords: string;
}

interface CompanySettingsData {
  companyName: string;
  subheading: string;
  phone: string;
  mobile: string;
  email: string;
  gstin: string;
  bankDetails: string;
  disclaimerText: string;
  loadingNote: string;
}

function fmt(v: number | null | undefined): string {
  return v != null ? v.toFixed(2) : "";
}

function QuotationPDFDocument({
  q,
  cs,
}: {
  q: QuotationData;
  cs: CompanySettingsData;
}) {
  const items = q.lineItems;

  const tableHeader = (
    <View style={[styles.tableRow, styles.tableHeaderRow]}>
      <View style={[styles.headerCell, styles.headerCellLeft, styles.colSl]}>
        <Text>#</Text>
      </View>
      <View style={[styles.headerCell, styles.colDesc]}>
        <Text>Description of Goods / Service</Text>
      </View>
      <View style={[styles.headerCell, styles.colGst]}>
        <Text>GST</Text>
      </View>
      <View style={[styles.headerCell, styles.colQty]}>
        <Text>Qty / Uom</Text>
      </View>
      <View style={[styles.headerCell, styles.colWeight]}>
        <Text>Weight</Text>
      </View>
      <View style={[styles.headerCell, styles.colRate]}>
        <Text>Rate</Text>
      </View>
      <View style={[styles.headerCell, styles.colNet]}>
        <Text>Net Value</Text>
      </View>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.headerCenter}>
          <Text style={styles.companyName}>{cs.companyName}</Text>
          <Text style={styles.subheading}>{cs.subheading}</Text>
          <Text style={styles.contactLine}>
            Ph: {cs.phone}{cs.mobile ? `, Mob: ${cs.mobile}` : ""}{cs.email ? `, Email: ${cs.email}` : ""}
          </Text>
          <Text style={styles.gstin}>GSTIN: {cs.gstin}</Text>
        </View>

        {/* ── Quotation Title ─────────────────────────────────── */}
        <View style={styles.quotationBar}>
          <Text>Quotation</Text>
        </View>

        {/* ── Customer Info + Metadata ────────────────────────── */}
        <View style={styles.infoRow}>
          <View style={styles.customerBlock}>
            <Text style={styles.customerName}>{q.customerName}</Text>
            {q.customerAddress ? (
              <Text style={styles.customerDetail}>
                Address: {q.customerAddress}
              </Text>
            ) : null}
            {q.customerPlace ? (
              <Text style={styles.customerDetail}>
                Place: {q.customerPlace}
              </Text>
            ) : null}
            {q.customerGstin ? (
              <Text style={styles.customerDetail}>
                GSTIN: {q.customerGstin}
              </Text>
            ) : null}
          </View>
          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Quot. No:</Text>
              <Text style={styles.metaValue}>{q.quotNo}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>
                {q.quotDate ? formatDate(new Date(q.quotDate)) : ""}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ref. No:</Text>
              <Text style={styles.metaValue}>{q.refNo}</Text>
            </View>
          </View>
        </View>

        {/* ── Line Items Table ────────────────────────────────── */}
        <View style={styles.table}>
          {/* Fixed header — repeats on each page */}
          <View fixed>{tableHeader}</View>

          {/* Body rows */}
          {items.map((item, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <View
                style={[
                  styles.cell,
                  styles.cellLeft,
                  i === 0 ? styles.cellTop : {},
                  styles.colSl,
                ]}
              >
                <Text>{String(i + 1)}</Text>
              </View>
              <View style={[styles.cell, i === 0 ? styles.cellTop : {}, styles.colDesc]}>
                <Text>{item.description}</Text>
              </View>
              <View style={[styles.cell, i === 0 ? styles.cellTop : {}, styles.colGst]}>
                <Text>{item.gstPercent}%</Text>
              </View>
              <View style={[styles.cell, i === 0 ? styles.cellTop : {}, styles.colQty]}>
                <Text>
                  {item.qty > 0 ? `${item.qty} ${item.unit}` : "-"}
                </Text>
              </View>
              <View style={[styles.cell, i === 0 ? styles.cellTop : {}, styles.colWeight]}>
                <Text>
                  {item.weightKg != null ? `${item.weightKg} Kg` : "-"}
                </Text>
              </View>
              <View style={[styles.cell, i === 0 ? styles.cellTop : {}, styles.colRate]}>
                <Text>{item.rate.toFixed(2)}</Text>
              </View>
              <View style={[styles.cell, i === 0 ? styles.cellTop : {}, styles.colNet]}>
                <Text>{item.netValue.toFixed(2)}</Text>
              </View>
            </View>
          ))}

          {/* Totals rows — wrapped to prevent page-break splitting */}
          <View wrap={false}>
            {[
              { label: "Sub Total:", value: fmt(q.subTotal) },
              { label: "CGST:", value: fmt(q.cgst) },
              { label: "SGST:", value: fmt(q.sgst) },
              { label: "Round Off:", value: fmt(q.roundOff) },
              { label: "Net Amount", value: q.netAmount.toFixed(2), bold: true },
            ].map((row, i) => (
              <View style={styles.tableRow} key={`total-${i}`}>
                <View
                  style={[
                    styles.cell,
                    styles.cellLeft,
                    { flex: 1 },
                  ]}
                >
                  <Text style={styles.totalsLabel}>{row.label}</Text>
                </View>
                <View
                  style={[
                    styles.cell,
                    styles.colNet,
                    { justifyContent: "center", alignItems: "flex-end" },
                    row.bold ? { fontFamily: "Helvetica-Bold" } : {},
                  ]}
                >
                  <Text>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Amount in Words ─────────────────────────────────── */}
        <View style={[styles.footerRow, { justifyContent: "flex-end", marginBottom: 4 }]}>
          <Text style={styles.amountInWords}>{q.amountInWords}</Text>
        </View>

        {/* ── Seal / Signature Space ───────────────────────────── */}
        <View style={styles.sealSpacer} />

        {/* ── Signature + Footer — wrapped to keep as a block ─── */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.signature}>
            <Text>For {cs.companyName}</Text>
            <Text style={styles.signatory}>Authorized Signatory</Text>
          </View>

          <Text style={styles.loadingNote}>{cs.loadingNote}</Text>

          <View style={styles.footerRow}>
            <Text>Delivery: {q.deliveryTerms || ""}</Text>
            <Text>Validity: {q.validity || "LIMITED"}</Text>
          </View>
          <View style={styles.footerRow}>
            <Text>GST: {q.gstNote || ""}</Text>
            <Text>Payment: {q.paymentTerms || "READY PAYMENT"}</Text>
          </View>

          <Text style={styles.disclaimer}>{cs.disclaimerText}</Text>
          <Text style={styles.bankDetails}>
            Bank: {cs.bankDetails}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export { QuotationPDFDocument };
export type { QuotationData, CompanySettingsData };
