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
        "glass pointer-events-none absolute z-30 min-w-[200px] rounded-xl px-3 py-2.5 font-mono text-[11px] text-white shadow-floating transition",
        visible ? "opacity-100" : "opacity-0"
      )}
      style={{ left: hoverReadout.screenX + 14, top: hoverReadout.screenY + 14 }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-mute-2 normal-case">{t("hover.velocity")}</span>
        <span className="tabular-nums text-spark-200">
          {hoverReadout.velocity.toFixed(2)}<span className="ml-0.5 text-mute-2">m/s</span>
        </span>
      </div>
      {hoverReadout.velocityRel !== undefined ? (
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-mute-2">{t("hover.velocityRel")}</span>
          <span className="tabular-nums text-plasma-300">
            {hoverReadout.velocityRel.toFixed(2)}<span className="ml-0.5 text-mute-2">m/s</span>
          </span>
        </div>
      ) : null}
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-mute-2">{t("hover.force")}</span>
        <span className="tabular-nums text-ember-300">
          {hoverReadout.force.toFixed(2)}<span className="ml-0.5 text-mute-2">N</span>
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-mute-2">{t("hover.kineticEnergy")}</span>
        <span className="tabular-nums text-violet2-400">
          {hoverReadout.kineticEnergy.toFixed(2)}<span className="ml-0.5 text-mute-2">J</span>
        </span>
      </div>
    </div>
  );
}
