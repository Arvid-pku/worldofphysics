"use client";

import { Sigma } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import type { FbdAxesMode, Vec2 } from "@/lib/physics/types";
import { cn } from "@/lib/utils/cn";

function mag(v: Vec2) {
  return Math.hypot(v.x, v.y);
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(0);
  if (abs >= 100) return n.toFixed(1);
  if (abs >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

function dotV(a: Vec2, b: Vec2) {
  return a.x * b.x + a.y * b.y;
}

const SWATCH: Record<string, string> = {
  net: "bg-ember-400 shadow-[0_0_8px_rgba(255,184,87,0.6)]",
  gravity: "bg-ok-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]",
  coulomb: "bg-bad-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]",
  electric: "bg-spark-400 shadow-[0_0_8px_rgba(61,151,255,0.5)]",
  magnetic: "bg-violet2-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]",
  normal: "bg-white/80",
  friction: "bg-ember-300 shadow-[0_0_8px_rgba(255,208,138,0.4)]"
};

function ForceRow({
  label,
  v,
  kind,
  axesMode,
  axes
}: {
  label: string;
  v: Vec2;
  kind: keyof typeof SWATCH;
  axesMode: FbdAxesMode;
  axes: { n: Vec2 | null; t: Vec2 | null };
}) {
  const hasContactAxes = axesMode === "contact" && axes.n && axes.t;
  const compA = hasContactAxes ? dotV(v, axes.n!) : v.x;
  const compB = hasContactAxes ? dotV(v, axes.t!) : v.y;
  const compLabelA = hasContactAxes ? "Fn" : "Fx";
  const compLabelB = hasContactAxes ? "Ft" : "Fy";
  const m = mag(v);
  return (
    <div className="surface flex items-center gap-3 rounded-lg px-3 py-2">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", SWATCH[kind])} />
      <div className="min-w-0 flex-1 text-[12px] font-medium text-white">{label}</div>
      <div className="font-mono text-[10.5px] tabular-nums text-mute-2">
        {compLabelA}={fmt(compA)} · {compLabelB}={fmt(compB)}
      </div>
      <div className="font-mono text-[11px] tabular-nums text-white">
        |F|={fmt(m)}
        <span className="ml-0.5 text-mute-2">N</span>
      </div>
    </div>
  );
}

export function FbdPanel() {
  const { t } = useI18n();
  const { fbdAxesMode, setFbdAxesMode, selected, fbdReadout } = useSandbox();

  const bodySelected = selected.kind === "body" ? selected.id : null;
  const readout = bodySelected && fbdReadout?.bodyId === bodySelected ? fbdReadout : null;

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-white">
          <Sigma className="h-3.5 w-3.5 text-ember-300" />
          {t("fbd.title")}
        </div>
        <select
          value={fbdAxesMode}
          onChange={(e) => setFbdAxesMode(e.target.value as FbdAxesMode)}
          className="surface h-7 rounded-md border border-white/[0.08] bg-white/[0.02] px-1.5 text-[11px] text-white outline-none"
        >
          <option value="world">{t("fbd.axes.world")}</option>
          <option value="contact">{t("fbd.axes.contact")}</option>
        </select>
      </header>

      <div className="p-3">
        {!readout ? (
          <div className="surface grid place-items-center rounded-xl px-4 py-10 text-center">
            <div className="font-display text-[14px] font-semibold text-white">
              {t("fbd.empty")}
            </div>
            <div className="mt-1 text-[11.5px] text-mute-2">
              Click any dynamic body to inspect its forces.
            </div>
          </div>
        ) : (
          <div className="grid gap-1.5">
            <ForceRow
              label={t("fbd.force.net")}
              v={readout.net}
              kind="net"
              axesMode={fbdAxesMode}
              axes={{ n: readout.normalAxis, t: readout.tangentAxis }}
            />
            <ForceRow
              label={t("fbd.force.gravity")}
              v={readout.gravity}
              kind="gravity"
              axesMode={fbdAxesMode}
              axes={{ n: readout.normalAxis, t: readout.tangentAxis }}
            />
            <ForceRow
              label={t("fbd.force.coulomb")}
              v={readout.coulomb}
              kind="coulomb"
              axesMode={fbdAxesMode}
              axes={{ n: readout.normalAxis, t: readout.tangentAxis }}
            />
            <ForceRow
              label={t("fbd.force.electric")}
              v={readout.electric}
              kind="electric"
              axesMode={fbdAxesMode}
              axes={{ n: readout.normalAxis, t: readout.tangentAxis }}
            />
            <ForceRow
              label={t("fbd.force.magnetic")}
              v={readout.magnetic}
              kind="magnetic"
              axesMode={fbdAxesMode}
              axes={{ n: readout.normalAxis, t: readout.tangentAxis }}
            />
            <ForceRow
              label={t("fbd.force.normal")}
              v={readout.normal}
              kind="normal"
              axesMode={fbdAxesMode}
              axes={{ n: readout.normalAxis, t: readout.tangentAxis }}
            />
            <ForceRow
              label={t("fbd.force.friction")}
              v={readout.friction}
              kind="friction"
              axesMode={fbdAxesMode}
              axes={{ n: readout.normalAxis, t: readout.tangentAxis }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
