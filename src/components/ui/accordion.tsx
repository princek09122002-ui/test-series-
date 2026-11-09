"use client";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
export const Accordion = AccordionPrimitive.Root;
export const AccordionItem = AccordionPrimitive.Item;
export function AccordionTrigger({
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger
        className="group flex w-full items-center justify-between gap-3 py-4 text-left font-medium text-sm [&[data-state=open]>svg]:rotate-180"
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 transition-transform" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
export function AccordionContent(
  props: React.ComponentProps<typeof AccordionPrimitive.Content>,
) {
  return <AccordionPrimitive.Content className="pb-5" {...props} />;
}
