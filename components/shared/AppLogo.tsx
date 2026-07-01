import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: "h-8 w-8 rounded-xl", icon: "h-4 w-4", text: "text-sm" },
  md: { box: "h-10 w-10 rounded-2xl", icon: "h-5 w-5", text: "text-base" },
  lg: { box: "h-14 w-14 rounded-2xl", icon: "h-7 w-7", text: "text-xl" },
};

export function AppLogo({ size = "md", showText = true, className }: AppLogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          s.box,
          "bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow shrink-0"
        )}
      >
        <Leaf className={cn(s.icon, "text-primary-foreground")} />
      </div>
      {showText && (
        <span className={cn(s.text, "font-display font-bold tracking-tight")}>
          Hidden<span className="text-primary">Spots</span>
        </span>
      )}
    </div>
  );
}
