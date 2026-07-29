"use client";
import { use, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuotation } from "@/hooks/use-quotation";
import { QuotationHeaderForm } from "@/components/quotations/quotation-header-form";
import { QuotationLineItems } from "@/components/quotations/quotation-line-items";
import { QuotationTotals } from "@/components/quotations/quotation-totals";
import { QuotationPreview } from "@/components/quotations/quotation-preview";
import type { StorePreviewSettings } from "@/components/quotations/quotation-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  FileDown,
  ArrowLeft,
  Loader2,
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScaledPreview } from "@/components/quotations/scaled-preview";

export default function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "admin" || role === "superadmin" || role === "manager";

  const [finalizing, setFinalizing] = useState(false);
  const [showDocLockDialog, setShowDocLockDialog] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StorePreviewSettings | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const quote = useQuotation(parseInt(id));

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setStoreSettings(data);
      })
      .catch(() => {});
  }, []);

  const isDocumentLocked = Boolean(quote.isLocked);
  const isReadOnlyForStaff = !isAdmin && isDocumentLocked;

  const handleToggleDocLock = async () => {
    const targetState = !isDocumentLocked;
    quote.updateIsLocked(targetState);
    setShowDocLockDialog(false);
    await quote.manualSave();
    toast.success(
      targetState
        ? "Document locked. Staff can no longer edit."
        : "Document unlocked. Staff can now edit."
    );
  };

  async function finalize() {
    if (!quote.header.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (quote.lineItems.length === 0) {
      toast.error("At least one line item is required");
      return;
    }

    setFinalizing(true);
    quote.updateStatus("finalized");

    try {
      await quote.manualSave();
      const r = await fetch(`/api/quotations/${quote.id}/finalize`, {
        method: "POST",
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast.error(err.error || "Failed to finalize");
        setFinalizing(false);
        return;
      }

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quotation_${quote.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Quotation finalized & PDF downloaded");
    } catch {
      toast.error("Error finalizing quotation");
    } finally {
      setFinalizing(false);
    }
  }

  const handleMarkAsDraft = async () => {
    quote.updateStatus("draft");
    await quote.manualSave();
    toast.success("Status changed to Draft");
  };

  if (quote.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-16">
      {/* Left Pane */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 sm:px-4 sm:py-3 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/quotations">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[15px] font-semibold tracking-tight">
                  Edit Quotation
                </h1>
                <Badge
                  variant={
                    quote.status === "finalized" ? "default" : "secondary"
                  }
                  className="capitalize text-[11px]"
                >
                  {quote.status}
                </Badge>
                {isDocumentLocked && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[11px] flex items-center gap-1"
                  >
                    <Lock className="h-3 w-3" /> Locked
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[12px]">
                {quote.dirty && (
                  <span className="text-amber-600 font-medium">
                    Unsaved changes
                  </span>
                )}
                {quote.saving && (
                  <span className="text-muted-foreground">Saving...</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {isAdmin && (
              <Button
                variant={isDocumentLocked ? "destructive" : "outline"}
                size="sm"
                onClick={() => setShowDocLockDialog(true)}
                className={
                  isDocumentLocked
                    ? "bg-amber-600 hover:bg-amber-700 text-white flex-1 sm:flex-initial"
                    : "border-amber-300 text-amber-800 hover:bg-amber-50 flex-1 sm:flex-initial"
                }
              >
                {isDocumentLocked ? (
                  <><Lock className="h-3.5 w-3.5 mr-1.5" /> Locked</>
                ) : (
                  <><Unlock className="h-3.5 w-3.5 mr-1.5" /> Lock to Staff</>
                )}
              </Button>
            )}

            {!isReadOnlyForStaff && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-initial"
                onClick={quote.manualSave}
                disabled={quote.saving}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Draft
              </Button>
            )}

            {isAdmin && quote.status === "finalized" && (
              <Button variant="ghost" size="sm" onClick={handleMarkAsDraft} className="flex-1 sm:flex-initial">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Mark as Draft
              </Button>
            )}

            {/* Mobile Preview & Download button */}
            {!isReadOnlyForStaff && (
              <Button
                size="sm"
                className="flex-1 sm:flex-initial lg:hidden text-xs sm:text-sm"
                onClick={() => setPreviewOpen(true)}
                disabled={finalizing}
              >
                <Eye className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <span>{quote.status === "finalized" ? "Preview & Re-Finalize" : "Preview & Download"}</span>
              </Button>
            )}

            {/* Desktop Finalize & Download button */}
            {!isReadOnlyForStaff && (
              <Button size="sm" className="hidden lg:flex" onClick={finalize} disabled={finalizing}>
                {finalizing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : quote.status === "finalized" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                ) : (
                  <FileDown className="h-3.5 w-3.5 mr-1.5" />
                )}
                {quote.status === "finalized"
                  ? "Re-Finalize & Download"
                  : "Finalize & Download"}
              </Button>
            )}
          </div>
        </div>

        {isReadOnlyForStaff && (
          <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-900">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium">Document Locked</p>
              <p className="text-[12px] text-amber-800/80">
                This quotation has been locked by an administrator. Staff cannot
                edit header details or line items.
              </p>
            </div>
          </div>
        )}

        <QuotationHeaderForm
          header={quote.header}
          onChange={isReadOnlyForStaff ? () => {} : quote.updateHeader}
          readOnly={isReadOnlyForStaff}
        />

        <Card className="p-5 shadow-sm overflow-visible">
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <h3 className="text-sm font-semibold">Line Items</h3>
            <span className="text-[12px] text-muted-foreground">
              {quote.lineItems.length} item
              {quote.lineItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          <QuotationLineItems
            lineItems={quote.lineItems}
            onAdd={quote.addLineItem}
            onUpdate={quote.updateLineItem}
            onRemove={quote.removeLineItem}
            onMove={quote.moveLineItem}
            onSyncCatalogItems={quote.syncCatalogItems}
            onSaveDraft={quote.manualSave}
            onClearDraft={() => {}}
            readOnly={isReadOnlyForStaff}
          />
          <div className="mt-6 pt-4 border-t">
            <QuotationTotals totals={quote.totals} />
          </div>
        </Card>
      </div>

      {/* Right Pane: Preview — desktop only */}
      <div className="hidden lg:block w-[460px] xl:w-[500px] shrink-0 lg:sticky lg:top-6 self-start space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Live Preview
          </h2>
        </div>
        <div className="shadow-lg rounded-lg overflow-hidden border">
          <QuotationPreview
            header={quote.header}
            lineItems={quote.lineItems}
            totals={quote.totals}
            storeSettings={storeSettings}
            quotNo={quote.quotNo}
          />
        </div>
      </div>

      <Dialog open={showDocLockDialog} onOpenChange={setShowDocLockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 font-semibold mb-1">
              <ShieldAlert className="h-4 w-4" />
              <span>
                {isDocumentLocked
                  ? "Unlock Quotation?"
                  : "Lock Quotation to Staff?"}
              </span>
            </div>
            <DialogTitle className="text-base font-medium">
              Quotation #{quote.id}
            </DialogTitle>
            <DialogDescription className="text-sm pt-2 text-muted-foreground">
              {isDocumentLocked
                ? "Unlocking allows staff to edit customer details, terms, and line items."
                : "Locking prevents staff from modifying any part of this quotation."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDocLockDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className={
                isDocumentLocked
                  ? "bg-primary"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }
              onClick={handleToggleDocLock}
            >
              {isDocumentLocked ? (
                <>
                  <Unlock className="h-3.5 w-3.5 mr-1.5" /> Unlock
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 mr-1.5" /> Lock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Preview & Download Sheet */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="p-0 max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="!p-0 px-5 pt-4 pb-3.5 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">
                PDF Preview
              </SheetTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={finalize} disabled={finalizing} className="h-8 text-xs">
                  {finalizing ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {quote.status === "finalized" ? "Re-Finalize & Download" : "Finalize & Download"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)} className="h-8 text-xs">
                  Close
                </Button>
              </div>
            </div>
          </SheetHeader>
          <div className="p-4 pb-12">
            <ScaledPreview
              header={quote.header}
              lineItems={quote.lineItems}
              totals={quote.totals}
              storeSettings={storeSettings}
              quotNo={quote.quotNo}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
