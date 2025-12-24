"use client";

import { Pause, Play, RotateCcw, StepForward } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { cn } from "@/lib/utils/cn";

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueLabel
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  valueLabel?: string;
}) {
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <div className="w-24 text-xs text-slate-400">{label}</div>
      <input
        className="h-2 w-full cursor-pointer accent-blue-500"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="w-20 text-right text-xs tabular-nums text-slate-300">
        {valueLabel ?? value.toFixed(2)}
      </div>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
  active
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-md border text-slate-200 transition",
        active
          ? "border-blue-500/40 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
          : "border-slate-800 bg-slate-950/40 hover:bg-slate-900/50"
      )}
    >
      {children}
    </button>
  );
}

export function TopControls() {
  const { t } = useI18n();
  const {
    isRunning,
    setIsRunning,
    gravity,
    setGravity,
    timeScale,
    setTimeScale,
    showVelocityVectors,
    setShowVelocityVectors,
    showCollisionPoints,
    setShowCollisionPoints,
    showTrails,
    setShowTrails,
    showGraphs,
    setShowGraphs,
    snapEnabled,
    setSnapEnabled,
    snapStepMeters,
    setSnapStepMeters,
    requestReset,
    requestStep
  } = useSandbox();

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-col gap-3">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2 backdrop-blur">
        <IconButton
          title={isRunning ? t("controls.pause") : t("controls.play")}
          onClick={() => setIsRunning(!isRunning)}
          active={isRunning}
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </IconButton>
        <IconButton title={t("controls.step")} onClick={requestStep}>
          <StepForward className="h-4 w-4" />
        </IconButton>
        <IconButton title={t("controls.reset")} onClick={requestReset}>
          <RotateCcw className="h-4 w-4" />
        </IconButton>

        <div className="mx-2 h-8 w-px bg-slate-800" />

        <Slider
          label={t("controls.gravity")}
          value={gravity}
          min={-20}
          max={20}
          step={0.1}
          onChange={setGravity}
          valueLabel={`${gravity.toFixed(1)} m/s²`}
        />
      </div>

      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2 backdrop-blur">
        <Slider label={t("controls.timeScale")} value={timeScale} min={0} max={2} step={0.01} onChange={setTimeScale} />
        <div className="mx-2 h-8 w-px bg-slate-800" />
        <label className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showVelocityVectors}
            onChange={(e) => setShowVelocityVectors(e.target.checked)}
            className="h-4 w-4 accent-blue-500"
          />
          {t("controls.vectors")}
        </label>
        <label className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showCollisionPoints}
            onChange={(e) => setShowCollisionPoints(e.target.checked)}
            className="h-4 w-4 accent-blue-500"
          />
          {t("controls.collisions")}
        </label>
        <label className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showTrails}
            onChange={(e) => setShowTrails(e.target.checked)}
            className="h-4 w-4 accent-blue-500"
          />
          {t("controls.trails")}
        </label>
        <label className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showGraphs}
            onChange={(e) => setShowGraphs(e.target.checked)}
            className="h-4 w-4 accent-blue-500"
          />
          {t("controls.graphs")}
        </label>
        <div className="mx-2 h-8 w-px bg-slate-800" />
        <label className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={(e) => setSnapEnabled(e.target.checked)}
            className="h-4 w-4 accent-blue-500"
          />
          {t("controls.snap")}
        </label>
        <label className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-2 text-xs text-slate-300">
          <span className="text-slate-400">{t("controls.snapStep")}</span>
          <select
            value={snapStepMeters}
            onChange={(e) => setSnapStepMeters(Number(e.target.value))}
            className="h-7 rounded border border-slate-800 bg-slate-950/60 px-1 text-xs text-slate-200 outline-none"
            disabled={!snapEnabled}
          >
            <option value={0.1}>0.10 m</option>
            <option value={0.25}>0.25 m</option>
            <option value={0.5}>0.50 m</option>
            <option value={1}>1.00 m</option>
          </select>
        </label>
        <div className="text-[11px] text-slate-500">{t("controls.timeHint")}</div>
      </div>
    </div>
  );
}
