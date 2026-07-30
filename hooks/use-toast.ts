"use client";

import { useState, useCallback, useEffect } from "react";

type ToastVariant = "default" | "destructive" | "success";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: { label: string; onClick: () => void };
}

let listeners: Array<(toasts: Toast[]) => void> = [];
let toastState: Toast[] = [];

function emitChange() {
  listeners.forEach((l) => l([...toastState]));
}

export function toast(opts: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  toastState = [...toastState, { id, ...opts }];
  emitChange();
  // Haptic on success/destructive
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    if (opts.variant === "success") navigator.vibrate(40);
    else if (opts.variant === "destructive") navigator.vibrate([30, 30, 30]);
  }
  setTimeout(() => {
    toastState = toastState.filter((t) => t.id !== id);
    emitChange();
  }, 4000);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(() => [...toastState]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    toastState = toastState.filter((t) => t.id !== id);
    emitChange();
  }, []);

  return { toasts, dismiss };
}
