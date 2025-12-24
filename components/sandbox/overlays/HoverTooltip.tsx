"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { cn } from "@/lib/utils/cn";

export function HoverTooltip() {
  const { t } = useI18n();
  const { hoverReadout, hoveredBodyId } = useSandbox();
  const visible = Boolean(hoverReadout && hoveredBodyId);
  if (!hoverReadout) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-30 min-w-[190px] rounded-lg border border-slate-800/70 bg-slate-950/40 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur transition",
        visible ? "opacity-100" : "opacity-0"
      )}
      style={{ left: hoverReadout.screenX + 14, top: hoverReadout.screenY + 14 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-slate-400">{t("hover.velocity")}</span>
        <span className="tabular-nums">{hoverReadout.velocity.toFixed(2)} m/s</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-slate-400">{t("hover.force")}</span>
        <span className="tabular-nums">{hoverReadout.force.toFixed(2)} N</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-slate-400">{t("hover.kineticEnergy")}</span>
        <span className="tabular-nums">{hoverReadout.kineticEnergy.toFixed(2)} J</span>
      </div>
    </div>
  );
}
