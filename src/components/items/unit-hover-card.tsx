"use client";

import { useState, useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ArrowLeftRight, Layers, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface AlternateUnitInfo {
  id?: number;
  unitId?: number;
  unit: { id?: number; name: string };
  conversionFactor: number;
}

export interface UnitHoverCardProps {
  primaryUnit?: { id?: number; name: string } | null;
  alternateUnits?: AlternateUnitInfo[] | null;
  rate?: number | null;
  description?: string | null;
  className?: string;
}

export function UnitHoverCard({
  primaryUnit,
  alternateUnits,
  rate,
  description,
  className = "",
}: UnitHoverCardProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const alts = alternateUnits ?? [];
  const primaryName = primaryUnit?.name || "Unit";

  if (alts.length === 0) {
    return <span className={`text-muted-foreground ${className}`}>{primaryName}</span>;
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold
          bg-primary/10 hover:bg-primary/20 backdrop-blur-xs
          border border-primary/25 hover:border-primary/40
          text-primary transition-all duration-150 cursor-pointer shadow-2xs group/unit
          ${className}
        `}
      >
        <span>{primaryName}</span>
        <span className="bg-primary/20 group-hover/unit:bg-primary/30 text-primary text-[10px] font-bold px-1.5 py-0.2 rounded-full transition-colors">
          +{alts.length}
        </span>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-80 p-0 overflow-hidden bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl z-50 animate-in fade-in-0 zoom-in-95"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <div className="bg-muted/40 border-b border-border p-3 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary">
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-foreground tracking-tight flex items-center justify-between">
              <span>Unit Conversions</span>
              <span className="text-[10px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                {alts.length + 1} Units Total
              </span>
            </h4>
            {description && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-normal">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 space-y-3">
          {/* Primary Unit */}
          <div className="rounded-lg bg-muted/30 border border-border/50 p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3 text-primary" /> Primary Unit
              </span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-background">
                Default
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-xs font-semibold text-foreground">
                1 {primaryName}
              </span>
              {rate != null && (
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  ₹{rate.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Alternate Units list */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block px-0.5">
              Additional Units &amp; Conversion Ratios
            </span>

            <div className="space-y-1.5">
              {alts.map((alt) => {
                const altRate = rate != null ? rate * alt.conversionFactor : null;
                return (
                  <div
                    key={alt.id ?? alt.unitId ?? alt.unit?.name}
                    className="rounded-lg bg-primary/5 border border-primary/15 p-2.5 transition-colors hover:bg-primary/10"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">
                        {alt.unit?.name || "Alt Unit"}
                      </span>
                      <span className="text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded-full tabular-nums">
                        ×{alt.conversionFactor}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span>Conversion:</span>
                        <span className="font-medium text-foreground tabular-nums">
                          1 {primaryName} = {alt.conversionFactor} {alt.unit?.name}
                        </span>
                      </div>
                      {altRate != null && (
                        <div className="flex items-center justify-between pt-0.5">
                          <span>Converted Rate:</span>
                          <span className="font-semibold text-foreground tabular-nums">
                            ₹{altRate.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="px-3 py-2 bg-muted/20 border-t border-border flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0 text-primary" />
          <span>Alternate units automatically convert rates when selected in quotes.</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
