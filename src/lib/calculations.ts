export function round(num: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

export interface LineItemInput {
  qty: number;
  rate: number;
  gstPercent: number;
  netValue?: number;
}

export interface LineTotals {
  subTotal: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  netAmount: number;
  totalGst: number;
}

export function computeNetValue(qty: number, rate: number): number {
  return round(qty * rate);
}

export function computeLineNetValue(item: LineItemInput): number {
  if (typeof item.netValue === "number" && Number.isFinite(item.netValue) && item.netValue >= 0) {
    return round(item.netValue);
  }
  return computeNetValue(item.qty, item.rate);
}

export function computeTotals(items: LineItemInput[]): LineTotals {
  const subTotal = round(items.reduce((s, i) => s + computeLineNetValue(i), 0));
  const totalGst = round(items.reduce((s, i) => s + computeLineNetValue(i) * (i.gstPercent / 100), 0));
  const cgst = round(totalGst / 2);
  const sgst = round(totalGst / 2);
  const rawTotal = subTotal + cgst + sgst;
  const netAmount = Math.round(rawTotal);
  const roundOff = round(netAmount - rawTotal);
  return { subTotal, cgst, sgst, roundOff, netAmount, totalGst };
}

const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
function convertHundreds(n: number): string {
  let r = ""; if (n >= 100) { r += ONES[Math.floor(n / 100)] + " Hundred "; n %= 100; }
  if (n >= 20) { r += TENS[Math.floor(n / 10)] + " "; n %= 10; }
  if (n > 0) r += ONES[n] + " "; return r.trim();
}
function numberToIndianWords(num: number): string {
  if (num === 0) return "Zero"; if (num < 0) return "Minus " + numberToIndianWords(Math.abs(num));
  const parts: string[] = []; let n = Math.floor(num);
  if (n >= 10000000) { parts.push(convertHundreds(Math.floor(n / 10000000)) + " Crore"); n %= 10000000; }
  if (n >= 100000) { parts.push(convertHundreds(Math.floor(n / 100000)) + " Lakh"); n %= 100000; }
  if (n >= 1000) { parts.push(convertHundreds(Math.floor(n / 1000)) + " Thousand"); n %= 1000; }
  if (n > 0) parts.push(convertHundreds(n));
  return parts.join(" ");
}
export function amountInWords(amount: number): string {
  const r = Math.floor(amount); const p = Math.round((amount - r) * 100);
  let result = "Rupees " + numberToIndianWords(r);
  if (p > 0) result += " and " + numberToIndianWords(p) + " Paise";
  return result + " Only";
}
