import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function StudentDeskBackground({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("student-desk-app relative min-h-[100dvh]", className)}
      {...props}
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[#4a3018] bg-[url('/student-desk-background.png')] bg-cover bg-center"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-amber-100/10"
        aria-hidden
      />
      {children}
    </div>
  );
}
