"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addComment, addCommentForShareToken, deleteComment } from "@/lib/actions/comments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import { toast } from "@/hooks/use-toast";

type Comment = {
  id: string;
  userId: string;
  body: string;
  createdAt: Date;
  user: { name: string | null; image: string | null };
};

interface Props {
  locationId: string;
  initialComments: Comment[];
  currentUserId?: string;
  canComment?: boolean;
  /** When set, comments go through token-scoped API (open/targeted share page). */
  shareToken?: string;
}

export function CommentsSection({
  locationId,
  initialComments,
  currentUserId,
  canComment = false,
  shareToken,
}: Props) {
  const t = useTranslations("sharing");
  const locale = useLocale();
  const dfLocale = locale === "he" ? he : enUS;
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !canComment) return;
    const draft = body;
    setBody("");
    startTransition(async () => {
      try {
        const comment = shareToken
          ? await addCommentForShareToken(shareToken, locationId, draft)
          : await addComment(locationId, draft);
        setComments((prev) => [...prev, comment]);
      } catch {
        toast({ title: t("commentFailed"), variant: "destructive" });
        setBody(draft);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        <MessageSquare className="h-4 w-4" />
        {t("commentsHeading", { count: comments.length })}
      </h3>

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 text-sm">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={c.user.image ?? undefined} />
              <AvatarFallback className="text-xs">
                {c.user.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-muted/40 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.user.name ?? t("explorerFallback")}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.createdAt), {
                    addSuffix: true,
                    locale: dfLocale,
                  })}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground whitespace-pre-line">{c.body}</p>
              {currentUserId === c.userId && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="mt-1 text-xs text-destructive/60 hover:text-destructive flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> {t("deleteComment")}
                </button>
              )}
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noComments")}</p>
        )}
      </div>

      {currentUserId && canComment && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("addComment")}
            rows={2}
            className="resize-none"
            maxLength={2000}
          />
          <Button type="submit" size="sm" disabled={isPending || !body.trim()} className="self-end">
            {isPending ? t("postingComment") : t("postComment")}
          </Button>
        </form>
      )}

      {currentUserId && !canComment && (
        <p className="text-xs text-muted-foreground">{t("viewOnlyHint")}</p>
      )}
    </div>
  );
}
