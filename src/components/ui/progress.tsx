"use client";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
export function Progress({
  value = 0,
  className,
}: {
  value?: number;
  className?: string;
}) {
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn("h-2 overflow-hidden rounded-full bg-secondary", className)}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full bg-primary transition-transform"
        style={{
          transform: `translateX(-${100 - Math.max(0, Math.min(100, value))}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  );
}
