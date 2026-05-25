import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-semibold transition active:scale-[0.98] disabled:opacity-50 touch-manipulation",
        variant === "primary" &&
          "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md",
        variant === "secondary" &&
          "bg-white text-indigo-700 border-2 border-indigo-200 hover:bg-indigo-50",
        variant === "ghost" && "bg-transparent text-slate-700 hover:bg-slate-100",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        size === "sm" && "px-4 py-2 text-sm min-h-[40px]",
        size === "md" && "px-6 py-3 text-base min-h-[48px]",
        size === "lg" && "px-8 py-4 text-lg min-h-[56px]",
        className,
      )}
      {...props}
    />
  );
}
