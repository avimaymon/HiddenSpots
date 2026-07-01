import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function PageHeader({
  title,
  description,
  children,
  className,
  sticky = true,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "border-b border-border/60 px-4 sm:px-6 py-4 sm:py-5",
        sticky && "sticky top-0 z-10 glass-strong safe-area-pt",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
      </div>
    </div>
  );
}
