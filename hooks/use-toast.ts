"use client";

import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive" | "success";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
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
  setTimeout(() => {
    toastState = toastState.filter((t) => t.id !== id);
    emitChange();
  }, 4000);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const subscribe = useCallback((listener: (t: Toast[]) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  useState(() => {
    const unsub = subscribe(setToasts);
    return unsub;
  });

  const dismiss = useCallback((id: string) => {
    toastState = toastState.filter((t) => t.id !== id);
    emitChange();
  }, []);

  return { toasts, dismiss };
}
