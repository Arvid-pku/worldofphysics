"use client";

import { cn } from "@/lib/utils/cn";

export function PanelHeader({
  icon,
  title,
  subtitle,
  actions,
  accent = "spark",
  className
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  accent?: "spark" | "ember" | "violet" | "plasma" | "ok";
  className?: string;
}) {
  const accentBg =
    accent === "ember"
      ? "from-ember-500/30 to-ember-400/0"
      : accent === "violet"
        ? "from-violet2-500/30 to-violet2-400/0"
        : accent === "plasma"
          ? "from-plasma-500/30 to-plasma-300/0"
          : accent === "ok"
            ? "from-ok-500/30 to-ok-400/0"
            : "from-spark-500/30 to-spark-300/0";

  const accentRing =
    accent === "ember"
      ? "ring-ember-400/30"
      : accent === "violet"
        ? "ring-violet2-400/30"
        : accent === "plasma"
          ? "ring-plasma-400/30"
          : accent === "ok"
            ? "ring-ok-400/30"
            : "ring-spark-400/30";

  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1",
              accentBg,
              accentRing
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="font-display text-[15px] font-semibold leading-tight text-white">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-[11.5px] leading-snug text-mute">{subtitle}</div>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}
