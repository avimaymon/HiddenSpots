"use client";

import { useState } from "react";
import { Link2, Loader2, Copy, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createShare } from "@/lib/actions/shares";
import { copyToClipboard } from "@/lib/navigation/external-links";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: string;
  collectionId?: string;
  tripId?: string;
  title?: string;
}

export function DbShareDialog({
  open,
  onOpenChange,
  locationId,
  collectionId,
  tripId,
  title,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<"VIEW" | "COMMENT" | "EDIT">("VIEW");
  const [email, setEmail] = useState("");

  async function handleCreate() {
    setLoading(true);
    try {
      const share = await createShare({
        permission,
        sharedWithEmail: email.trim() || undefined,
        locationId,
        collectionId,
        tripId,
      });
      const url = `${window.location.origin}/share/${share.publicToken}`;
      setShareUrl(url);
      toast({ title: "Share link created", variant: "success" });
    } catch (e) {
      toast({ title: "Failed to create share", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      toast({ title: "Link copied", variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setShareUrl(null);
      setEmail("");
      setPermission("VIEW");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Share {title ? `"${title}"` : "Link"}
          </DialogTitle>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Anyone with this link can view the shared content.
            </p>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-xs h-10" />
              <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0 rounded-xl">
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Permission</Label>
              <Select value={permission} onValueChange={(v) => setPermission(v as typeof permission)}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEW">View only</SelectItem>
                  <SelectItem value="COMMENT">Can comment</SelectItem>
                  <SelectItem value="EDIT">Can edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invite by email (optional)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="h-11"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {shareUrl ? "Close" : "Cancel"}
          </Button>
          {!shareUrl && (
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
