import React from "react";
import { cn } from "../../lib/utils";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  }
>(({ className, variant = "primary", ...props }, ref) => {
  const variants = {
    primary:
      "bg-primary text-white hover:bg-primary-hover shadow-sm shadow-primary/25",
    secondary: "bg-surface text-text hover:bg-border/50",
    ghost: "bg-transparent text-text-muted hover:bg-surface hover:text-primary",
    danger:
      "bg-danger text-white hover:bg-danger/90 shadow-sm shadow-danger/20",
    outline:
      "bg-transparent border border-border text-text-muted hover:bg-surface",
  };
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";
