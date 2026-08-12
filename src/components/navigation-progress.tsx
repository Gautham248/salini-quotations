"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(true);
  const rafRef = useRef<number>(0);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start the bar as soon as the URL changes
    let cancelled = false;

    // Animate to ~70% quickly, then hold
    let start: number | null = null;
    function tick(ts: number) {
      if (cancelled || !barRef.current) return;
      if (!start) start = ts;
      const elapsed = ts - start;
      // Ease-out: fast to 70% in 800ms, then slow crawl
      const pct = Math.min(0.7 + (elapsed > 800 ? (elapsed - 800) * 0.0003 : (elapsed / 800) * 0.7), 0.9);
      barRef.current.style.transform = `scaleX(${pct})`;
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const bar = barRef.current;
      if (bar) {
        bar.style.transform = "scaleX(1)";
        setTimeout(() => {
          if (bar) {
            bar.style.transform = "scaleX(0)";
            setVisible(false);
          }
        }, 200);
      } else {
        setVisible(false);
      }
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      role="progressbar"
      aria-label="Loading"
    >
      <div
        ref={barRef}
        className="h-full bg-primary origin-left transition-none"
        style={{ transform: "scaleX(0)", opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}
