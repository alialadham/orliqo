import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative block size-9 shrink-0 overflow-hidden bg-black", className)}
      aria-hidden="true"
    >
      <Image
        src="/brand/orliqo-mark.png"
        alt=""
        width={72}
        height={72}
        className="absolute inset-0 size-full scale-[1.72] object-cover"
        priority
      />
    </span>
  );
}

export function BrandLockup({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-white", className)}>
      <BrandMark className={compact ? "size-8" : "size-10"} />
      <span className={cn("font-heading font-semibold tracking-[-0.04em]", compact ? "text-2xl" : "text-[28px]")}>Orliqo</span>
    </span>
  );
}
