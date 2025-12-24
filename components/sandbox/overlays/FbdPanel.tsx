"use client";

import { Sigma } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import type { Vec2 } from "@/lib/physics/types";
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

function dot(a: Vec2, b: Vec2) {
  return a.x * b.x + a.y * b.y;
}

function ForceRow({
  label,
  v,
  swatch,
  axesMode,
  axes
}: {
  label: string;
  v: Vec2;
  swatch: string;
  axesMode: "world" | "contact";
  axes: { n: Vec2 | null; t: Vec2 | null };
}) {
  const hasContactAxes = axesMode === "contact" && axes.n && axes.t;
  const compA = hasContactAxes ? dot(v, axes.n!) : v.x;
  const compB = hasContactAxes ? dot(v, axes.t!) : v.y;
  const compLabelA = hasContactAxes ? "Fn" : "Fx";
  const compLabelB = hasContactAxes ? "Ft" : "Fy";
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-slate-200">
        <span className={cn("h-2.5 w-2.5 rounded-full", swatch)} />
        <span>{label}</span>
      </div>
      <div className="text-right text-xs tabular-nums text-slate-200">
        <span className="text-slate-400">
          ({compLabelA}={fmt(compA)}, {compLabelB}={fmt(compB)})
        </span>{" "}
        <span className="text-slate-300">|F|={fmt(mag(v))} N</span>
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
    <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/40 shadow-xl backdrop-blur">
      <header className="flex items-center justify-between gap-2 border-b border-slate-800/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sigma className="h-4 w-4 text-slate-200" />
          <div className="text-sm font-semibold text-slate-100">{t("fbd.title")}</div>
        </div>
        <select
          value={fbdAxesMode}
          onChange={(e) => setFbdAxesMode(e.target.value as any)}
          className="h-8 rounded-md border border-slate-800 bg-slate-950/60 px-2 text-xs text-slate-200 outline-none"
        >
          <option value="world">{t("fbd.axes.world")}</option>
          <option value="contact">{t("fbd.axes.contact")}</option>
        </select>
      </header>

      <div className="px-4 py-4">
        {!readout ? (
          <div className="grid place-items-center rounded-xl border border-slate-800/60 bg-slate-950/30 p-6 text-xs text-slate-400">
            {t("fbd.empty")}
          </div>
        ) : (
          <div className="grid gap-2">
            <ForceRow label={t("fbd.force.net")} v={readout.net} swatch="bg-amber-400" axesMode={fbdAxesMode} axes={{ n: readout.normalAxis, t: readout.tangentAxis }} />
            <ForceRow label={t("fbd.force.gravity")} v={readout.gravity} swatch="bg-emerald-400" axesMode={fbdAxesMode} axes={{ n: readout.normalAxis, t: readout.tangentAxis }} />
            <ForceRow label={t("fbd.force.coulomb")} v={readout.coulomb} swatch="bg-pink-400" axesMode={fbdAxesMode} axes={{ n: readout.normalAxis, t: readout.tangentAxis }} />
            <ForceRow label={t("fbd.force.electric")} v={readout.electric} swatch="bg-sky-400" axesMode={fbdAxesMode} axes={{ n: readout.normalAxis, t: readout.tangentAxis }} />
            <ForceRow label={t("fbd.force.magnetic")} v={readout.magnetic} swatch="bg-violet-400" axesMode={fbdAxesMode} axes={{ n: readout.normalAxis, t: readout.tangentAxis }} />
            <ForceRow label={t("fbd.force.normal")} v={readout.normal} swatch="bg-slate-200" axesMode={fbdAxesMode} axes={{ n: readout.normalAxis, t: readout.tangentAxis }} />
            <ForceRow label={t("fbd.force.friction")} v={readout.friction} swatch="bg-orange-400" axesMode={fbdAxesMode} axes={{ n: readout.normalAxis, t: readout.tangentAxis }} />
          </div>
        )}
      </div>
    </div>
  );
}
