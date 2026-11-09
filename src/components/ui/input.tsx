import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/25",
        className,
      )}
      {...props}
    />
  );
}
export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25",
        className,
      )}
      {...props}
    />
  );
}
export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-2 block text-sm font-medium", className)}
      {...props}
    />
  );
}
