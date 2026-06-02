import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Card({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "bg-card border border-border rounded-2xl soft-card-shadow overflow-hidden transition-all",
        className,
      )}
    >
      {children}
    </div>
  );
}
