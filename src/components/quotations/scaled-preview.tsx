"use client";
import { useRef, useEffect, useState } from "react";
import { QuotationPreview } from "./quotation-preview";
import type { StorePreviewSettings } from "./quotation-preview";
import type { QH } from "./quotation-header-form";
import type { LineItem } from "@/hooks/use-quotation";

/**
 * Renders QuotationPreview scaled to fit its parent container on mobile.
 * Uses a CSS transform so the A4 layout stays pixel-perfect, just smaller.
 */
export function ScaledPreview({
  header,
  lineItems,
  totals,
  storeSettings,
  quotNo,
}: {
  header: QH;
  lineItems: LineItem[];
  totals: {
    subTotal: number;
    cgst: number;
    sgst: number;
    roundOff: number;
    netAmount: number;
    totalGst: number;
  };
  storeSettings?: StorePreviewSettings | null;
  quotNo?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    function recalculate() {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;

      const containerWidth = container.offsetWidth;
      const innerWidth = inner.scrollWidth;
      if (innerWidth === 0) return;

      const s = Math.min(1, containerWidth / innerWidth);
      setScale(s);
      // After scaling, the visual height of the inner element is innerHeight * scale
      setInnerHeight(inner.scrollHeight * s);
    }

    // Run on mount and whenever content might change
    recalculate();
    const ro = new ResizeObserver(recalculate);
    if (containerRef.current) ro.observe(containerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [header, lineItems, totals]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ height: innerHeight ?? "auto" }}
    >
      <div
        ref={innerRef}
        style={{
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          // Keep it in flow by cancelling out the visual width expansion
          width: scale < 1 ? `${100 / scale}%` : "100%",
        }}
      >
        <QuotationPreview
          header={header}
          lineItems={lineItems}
          totals={totals}
          storeSettings={storeSettings}
          quotNo={quotNo}
        />
      </div>
    </div>
  );
}
