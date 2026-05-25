import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type AuthBackgroundProps = HTMLAttributes<HTMLDivElement> & {
  overlayClassName?: string;
  /** Art on the left, sign-in panel on the right (login). */
  layout?: "centered" | "split-right";
};

export function AuthBackground({
  children,
  className,
  overlayClassName,
  layout = "centered",
  ...props
}: AuthBackgroundProps) {
  if (layout === "split-right") {
    return (
      <div
        className={cn("relative flex min-h-[100dvh] flex-col md:flex-row", className)}
        {...props}
      >
        <div
          className="relative min-h-[32vh] shrink-0 bg-[#4a3018] bg-[url('/login-background.png')] bg-contain bg-left bg-no-repeat md:min-h-[100dvh] md:w-[58%] lg:w-[60%] xl:w-[62%]"
          aria-hidden
        />
        <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:py-10">
          <div
            className={cn(
              "absolute inset-0 bg-slate-950/85 backdrop-blur-sm",
              overlayClassName,
            )}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative min-h-[100dvh] overflow-x-hidden", className)}
      {...props}
    >
      <div
        className="absolute inset-0 bg-[#4a3018] bg-[url('/login-background.png')] bg-contain bg-center bg-no-repeat"
        aria-hidden
      />
      <div
        className={cn(
          "absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]",
          overlayClassName,
        )}
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
    </div>
  );
}
