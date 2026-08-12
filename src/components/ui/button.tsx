import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "secondary"
    | "destructive"
    | "link";
  size?: "sm" | "default" | "lg" | "icon";
  asChild?: boolean;
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100",
    outline:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    link: "text-indigo-600 underline-offset-4 hover:underline p-0",
  };
  const sizes = {
    sm: "h-8 rounded-lg px-3 text-xs",
    default: "h-10 px-4 py-2",
    lg: "h-12 rounded-xl px-6",
    icon: "h-9 w-9",
  };

  // asChild uses Slot-like behavior via Radix; here we render a native button.
  void asChild;

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
Button.displayName = "Button";

export { Button };
