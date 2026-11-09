import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
