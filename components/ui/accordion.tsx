"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface AccordionProps extends React.ComponentProps<"div"> {
  type?: "single" | "multiple";
  collapsible?: boolean;
}

function Accordion({ className, type: _type, collapsible: _collapsible, ...props }: AccordionProps) {
  return <div data-slot="accordion" className={cn("flex w-full flex-col", className)} {...props} />;
}

interface AccordionItemProps extends React.ComponentProps<"details"> {
  value?: string;
}

function AccordionItem({ className, value: _value, ...props }: AccordionItemProps) {
  return <details data-slot="accordion-item" className={cn("group not-last:border-b", className)} {...props} />;
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<"summary">) {
  return (
    <summary
      data-slot="accordion-trigger"
      className={cn(
        "flex cursor-pointer list-none items-center justify-between gap-2 py-2.5 text-left text-sm font-medium text-zinc-100 transition hover:text-white [&::-webkit-details-marker]:hidden",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
    </summary>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="accordion-content"
      className={cn("pb-3 text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
