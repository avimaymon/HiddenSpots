export default function LocaleLoading() {
  return (
    <div
      id="main-content"
      className="min-h-[40dvh] flex items-center justify-center p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-primary/15 animate-pulse" />
        <div className="h-2 w-28 rounded-full bg-muted animate-pulse" />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
