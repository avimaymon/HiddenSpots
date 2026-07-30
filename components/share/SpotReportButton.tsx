"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Flag } from "lucide-react";
import { submitSpotReport } from "@/lib/actions/reports";
import { toast } from "@/hooks/use-toast";

const REASONS = [
  { value: "INACCURATE", label: "Location is inaccurate" },
  { value: "CLOSED", label: "Place is closed or inaccessible" },
  { value: "DANGEROUS", label: "Safety hazard" },
  { value: "INAPPROPRIATE", label: "Inappropriate content" },
  { value: "DUPLICATE", label: "Duplicate spot" },
] as const;

export function SpotReportButton({ locationId }: { locationId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    startTransition(async () => {
      try {
        await submitSpotReport({ locationId, reason, details: details || undefined });
        toast({ title: "Report submitted. Thank you!", variant: "success" });
        setOpen(false);
        setReason("");
        setDetails("");
      } catch {
        toast({ title: "Failed to submit report", variant: "destructive" });
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs font-medium text-muted-foreground"
      >
        <Flag className="h-3.5 w-3.5" /> Report spot
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Report this spot</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Details (optional)</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Any additional information…"
                rows={3}
                maxLength={1000}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!reason || isPending}>
                {isPending ? "Submitting…" : "Submit Report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
