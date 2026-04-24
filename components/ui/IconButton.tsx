"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils/cn";

export type IconButtonProps = {
  active?: boolean;
  variant?: "ghost" | "solid" | "subtle";
  size?: "sm" | "md" | "lg";
  tone?: "default" | "danger" | "ember";
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { active, variant = "ghost", size = "md", tone = "default", className, children, ...rest },
  ref
) {
  const sizeCls = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";

  let activeCls = "";
  if (active) {
    activeCls =
      tone === "ember"
        ? "border-ember-400/40 bg-ember-500/10 text-ember-300 shadow-[0_0_0_1px_rgba(255,184,87,0.30)]"
        : tone === "danger"
          ? "border-bad-500/40 bg-bad-500/10 text-bad-400"
          : "border-spark-400/40 bg-spark-500/10 text-spark-200 shadow-[0_0_0_1px_rgba(61,151,255,0.30)]";
  }

  const variantCls =
    variant === "solid"
      ? "btn-primary"
      : variant === "subtle"
        ? "border border-transparent bg-white/[0.03] text-[#C9D2EC] hover:bg-white/[0.06] hover:text-white"
        : "btn-ghost";

  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={cn(
        "grid place-items-center rounded-lg transition relative",
        sizeCls,
        active ? activeCls : variantCls,
        className
      )}
    >
      {children}
    </button>
  );
});
