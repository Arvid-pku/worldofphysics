"use client";

import { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Eye,
  Gauge,
  Grid3x3,
  Library,
  MountainSnow,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  StepForward,
  Sprout,
  Wand2,
  Waves
} from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils/cn";

function valueToPct(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
}

function PillSlider({
  label,
  icon,
  value,
  min,
  max,
  step,
  onChange,
  valueLabel,
  unit,
  width = 72
}: {
  label: string;
  icon?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  valueLabel?: string;
  unit?: string;
  width?: number;
}) {
  const pct = valueToPct(value, min, max);
  return (
    <Tooltip label={label} side="bottom">
      <div className="surface group flex h-8 items-center gap-1.5 rounded-full px-2.5 transition hover:ring-1 hover:ring-white/[0.10]">
        {icon ? <span className="text-mute-2 group-hover:text-white">{icon}</span> : null}
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width, ["--val" as string]: `${pct}%` } as React.CSSProperties}
          className="cursor-pointer"
        />
        <span className="ml-0.5 min-w-[42px] text-right font-mono text-[11px] tabular-nums text-white">
          {valueLabel ?? value.toFixed(2)}
          {unit ? <span className="ml-0.5 text-[10px] text-mute-2">{unit}</span> : null}
        </span>
      </div>
    </Tooltip>
  );
}

function ToggleChip({
  label,
  icon,
  active,
  tone = "spark",
  onClick,
  showLabel = true
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  tone?: "spark" | "ember" | "violet" | "plasma" | "ok";
  onClick: () => void;
  showLabel?: boolean;
}) {
  const accent =
    tone === "ember"
      ? "ring-ember-400/40 bg-ember-500/10 text-ember-300"
      : tone === "violet"
        ? "ring-violet2-400/40 bg-violet2-500/10 text-violet2-400"
        : tone === "plasma"
          ? "ring-plasma-400/40 bg-plasma-500/10 text-plasma-300"
          : tone === "ok"
            ? "ring-ok-400/40 bg-ok-500/10 text-ok-400"
            : "ring-spark-400/40 bg-spark-500/10 text-spark-200";
  const inner = (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "group flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-medium transition",
        active
          ? `border-transparent ring-1 ${accent}`
          : "border-white/[0.06] bg-white/[0.02] text-[#A6B1D8] hover:bg-white/[0.05] hover:text-white"
      )}
    >
      <span>{icon}</span>
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
  return showLabel ? (
    inner
  ) : (
    <Tooltip label={label} side="bottom">
      {inner}
    </Tooltip>
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
    snapEnabled,
    setSnapEnabled,
    snapStepMeters,
    setSnapStepMeters,
    requestReset,
    requestStep,
    setShowScenes,
    setShowLabs,
    engineRef,
    resetNonce
  } = useSandbox();

  const [bodyCount, setBodyCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [containerW, setContainerW] = useState(900);
  const fpsAccum = useRef({ last: 0, frames: 0, last1s: 0 });
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Periodically refresh body count + fps. Cheap interval.
  useEffect(() => {
    let raf = 0;
    function tick() {
      const engine = engineRef.current;
      if (engine) {
        const all = (engine.world && engine.world.bodies) || [];
        setBodyCount(all.length);
      }
      const now = performance.now();
      const acc = fpsAccum.current;
      if (acc.last) {
        acc.frames += 1;
        if (now - acc.last1s >= 500) {
          const dt = (now - acc.last1s) / 1000;
          setFps(Math.round(acc.frames / dt));
          acc.last1s = now;
          acc.frames = 0;
        }
      } else {
        acc.last1s = now;
      }
      acc.last = now;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engineRef, resetNonce]);

  // Track our wrapping container width (the canvas area).
  useEffect(() => {
    const el = wrapRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const showLabels = containerW >= 1140;
  const showLive = containerW >= 880;
  const showQuick = containerW >= 720;
  const showStatusText = containerW >= 1040;

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2"
    >
      <div className="pointer-events-auto glass animate-fade-up flex items-center gap-1 rounded-full px-1.5 py-1 shadow-floating">
        {/* Status pulse */}
        <Tooltip
          label={isRunning ? t("topbar.status.running") : t("topbar.status.paused")}
          side="bottom"
        >
          <div className="ml-1 flex h-8 items-center gap-1.5 px-2">
            <span className="relative grid h-2 w-2 place-items-center">
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-full",
                  isRunning ? "bg-ok-500 animate-pulse-soft" : "bg-ember-500"
                )}
              />
              {isRunning ? (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-ok-500/60 animate-pulse-ring"
                />
              ) : null}
            </span>
            {showStatusText ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
                {isRunning ? t("topbar.status.running") : t("topbar.status.paused")}
              </span>
            ) : null}
          </div>
        </Tooltip>
        <div className="divider-v mx-0.5" />

        {/* Transport */}
        <Tooltip
          label={isRunning ? t("controls.pause") : t("controls.play")}
          shortcut="Space"
          side="bottom"
        >
          <IconButton
            size="sm"
            variant={isRunning ? "ghost" : "solid"}
            active={isRunning}
            onClick={() => setIsRunning(!isRunning)}
            aria-label={isRunning ? t("controls.pause") : t("controls.play")}
          >
            {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </IconButton>
        </Tooltip>
        <Tooltip label={t("controls.step")} shortcut="→" side="bottom">
          <IconButton size="sm" variant="ghost" aria-label={t("controls.step")} onClick={requestStep}>
            <StepForward className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>
        <Tooltip label={t("controls.reset")} shortcut={["⇧", "R"]} side="bottom">
          <IconButton size="sm" variant="ghost" aria-label={t("controls.reset")} onClick={requestReset}>
            <RotateCcw className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>
        <div className="divider-v mx-0.5" />

        {/* World sliders */}
        <PillSlider
          label={t("controls.gravity")}
          icon={<MountainSnow className="h-3 w-3" />}
          value={gravity}
          min={-20}
          max={20}
          step={0.1}
          onChange={setGravity}
          valueLabel={gravity.toFixed(1)}
          unit="m/s²"
          width={72}
        />
        <PillSlider
          label={t("controls.timeScale")}
          icon={<Gauge className="h-3 w-3" />}
          value={timeScale}
          min={0}
          max={2}
          step={0.01}
          onChange={setTimeScale}
          valueLabel={`${timeScale.toFixed(2)}×`}
          width={64}
        />
        <div className="divider-v mx-0.5" />

        {/* Display toggles */}
        <ToggleChip
          label={t("controls.vectors")}
          icon={<Wand2 className="h-3.5 w-3.5" />}
          active={showVelocityVectors}
          tone="spark"
          onClick={() => setShowVelocityVectors(!showVelocityVectors)}
          showLabel={showLabels}
        />
        <ToggleChip
          label={t("controls.collisions")}
          icon={<Crosshair className="h-3.5 w-3.5" />}
          active={showCollisionPoints}
          tone="ember"
          onClick={() => setShowCollisionPoints(!showCollisionPoints)}
          showLabel={showLabels}
        />
        <ToggleChip
          label={t("controls.trails")}
          icon={<Waves className="h-3.5 w-3.5" />}
          active={showTrails}
          tone="plasma"
          onClick={() => setShowTrails(!showTrails)}
          showLabel={showLabels}
        />
        <ToggleChip
          label={t("controls.snap")}
          icon={<Grid3x3 className="h-3.5 w-3.5" />}
          active={snapEnabled}
          tone="violet"
          onClick={() => setSnapEnabled(!snapEnabled)}
          showLabel={showLabels}
        />
        {snapEnabled ? (
          <select
            value={snapStepMeters}
            onChange={(e) => setSnapStepMeters(Number(e.target.value))}
            className="surface h-8 rounded-full border border-white/[0.06] bg-white/[0.02] px-2 font-mono text-[10.5px] text-white outline-none"
            aria-label={t("controls.snapStep")}
          >
            <option value={0.1}>0.10 m</option>
            <option value={0.25}>0.25 m</option>
            <option value={0.5}>0.50 m</option>
            <option value={1}>1.00 m</option>
          </select>
        ) : null}

        {showQuick ? (
          <>
            <div className="divider-v mx-0.5" />
            <Tooltip label={t("controls.scenes")} side="bottom">
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={t("controls.scenes")}
                onClick={() => setShowScenes(true)}
              >
                <Library className="h-3.5 w-3.5" />
              </IconButton>
            </Tooltip>
            <Tooltip label={t("labs.open")} shortcut="L" side="bottom">
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={t("labs.open")}
                onClick={() => setShowLabs(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </IconButton>
            </Tooltip>
          </>
        ) : null}

        {showLive ? (
          <>
            <div className="divider-v mx-0.5" />
            <div className="flex items-center gap-2.5 px-2 font-mono text-[10px] text-mute">
              <span className="flex items-center gap-1">
                <Sprout className="h-3 w-3" />
                <span className="tabular-nums text-white">{Math.max(0, bodyCount - 1)}</span>
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span className="tabular-nums text-white">{fps}</span>
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
