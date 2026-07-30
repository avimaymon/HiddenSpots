"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

function ErrorFallbackInner({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("errors");
  return (
    <div
      role="alert"
      className="min-h-[40dvh] flex flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
      </div>
      <p className="font-semibold">{t("somethingWentWrong")}</p>
      <p className="text-sm text-muted-foreground max-w-xs">{t("tryAgainHint")}</p>
      <button
        type="button"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-2 py-1"
        onClick={onRetry}
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        {t("tryAgain")}
      </button>
    </div>
  );
}

function ErrorFallbackStatic({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="min-h-[40dvh] flex flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <p className="font-semibold">Something went wrong · משהו השתבש</p>
      <button type="button" className="text-sm text-primary underline" onClick={onRetry}>
        Try again · נסה שוב
      </button>
    </div>
  );
}

/** Catches i18n failures inside the translated fallback UI. */
class IntlSafeFallback extends Component<
  { onRetry: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <ErrorFallbackStatic onRetry={this.props.onRetry} />;
    }
    return <ErrorFallbackInner onRetry={this.props.onRetry} />;
  }
}

export class ClientErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: `${error.stack ?? ""}\n${info.componentStack ?? ""}`,
        href: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    }).catch(() => undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <IntlSafeFallback onRetry={() => this.setState({ hasError: false })} />
      );
    }
    return this.props.children;
  }
}
