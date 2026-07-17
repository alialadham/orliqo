import { FlaskConical } from "lucide-react";

import { cn } from "@/lib/utils";

export function DemoNotice({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <aside
      aria-label="Demo mode"
      className={cn(
        "flex items-center gap-2 border border-primary/20 bg-primary/[0.045] text-foreground",
        compact ? "rounded-md px-3 py-2 text-xs" : "min-h-9 px-4 py-2 text-sm",
        className,
      )}
    >
      <FlaskConical className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span><strong>Demo mode.</strong> Synthetic data only; email and WhatsApp delivery are disabled.</span>
    </aside>
  );
}
