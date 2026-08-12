import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid w-full items-start gap-1.5", className)}
      {...props}
    />
  );
}
Field.displayName = "Field";

export function FieldLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400",
        className
      )}
      {...props}
    />
  );
}
FieldLabel.displayName = "FieldLabel";
