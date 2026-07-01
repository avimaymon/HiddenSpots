"use client";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-[calc(var(--nav-height)+var(--safe-bottom)+1rem)] md:bottom-4 end-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-[420px] rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl p-4 shadow-glass-lg animate-slide-in-right",
            toast.variant === "destructive" && "border-destructive/40 bg-destructive/8",
            toast.variant === "success" && "border-green-500/30 bg-green-500/5"
          )}
        >
          {toast.variant === "destructive" ? (
            <div className="h-8 w-8 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          ) : toast.variant === "success" ? (
            <div className="h-8 w-8 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Info className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0 py-0.5">
            {toast.title && (
              <p className="text-sm font-bold leading-tight">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100 hover:bg-muted transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
