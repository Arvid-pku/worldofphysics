"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { findBodyByMetaId } from "@/lib/physics/bodyMeta";
import { worldToMeters, worldVelocityStepToMps } from "@/lib/physics/units";
import { cn } from "@/lib/utils/cn";

type MetricKey =
  | "x"
  | "y"
  | "speed"
  | "accel"
  | "ke"
  | "pe"
  | "energy"
  | "momentum"
  | "impulse";

type Sample = {
  t: number;
  x: number;
  y: number;
  speed: number;
  accel: number;
  ke: number;
  pe: number;
  energy: number;
  momentum: number;
  impulse: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(0);
  if (abs >= 100) return n.toFixed(1);
  if (abs >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

export function GraphsPanel() {
  const { t } = useI18n();
  const { engineRef, selected, gravity } = useSandbox();

  const bodyId = selected.kind === "body" ? selected.id : null;

  const [metric, setMetric] = useState<MetricKey>("speed");
  const metricLabel = useMemo(() => {
    const map: Record<MetricKey, { label: string; unit: string }> = {
      x: { label: "x(t)", unit: "m" },
      y: { label: "y(t)", unit: "m" },
      speed: { label: "|v|(t)", unit: "m/s" },
      accel: { label: "|a|(t)", unit: "m/s²" },
      ke: { label: "KE(t)", unit: "J" },
      pe: { label: "PE(t)", unit: "J" },
      energy: { label: "E(t)", unit: "J" },
      momentum: { label: "|p|(t)", unit: "kg·m/s" },
      impulse: { label: "|J|(t)", unit: "N·s" }
    };
    return map[metric];
  }, [metric]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const samplesRef = useRef<Sample[]>([]);
  const lastRef = useRef<{
    timeMs: number;
    vx: number;
    vy: number;
    impulse: number;
  } | null>(null);

  useEffect(() => {
    samplesRef.current = [];
    lastRef.current = null;
  }, [bodyId]);

  useEffect(() => {
    let raf = 0;

    const loop = () => {
      const now = performance.now();
      const engine = engineRef.current;
      if (!engine || !bodyId) {
        raf = window.requestAnimationFrame(loop);
        return;
      }

      const body = findBodyByMetaId(engine, bodyId);
      if (!body) {
        raf = window.requestAnimationFrame(loop);
        return;
      }

      const dtMs = engine.timing.lastDelta || 1000 / 60;
      const vx = worldVelocityStepToMps(body.velocity.x, dtMs);
      const vy = worldVelocityStepToMps(body.velocity.y, dtMs);

      const last = lastRef.current;
      const dtSec = last ? (now - last.timeMs) / 1000 : 0;
      const ax = last && dtSec > 0 ? (vx - last.vx) / dtSec : 0;
      const ay = last && dtSec > 0 ? (vy - last.vy) / dtSec : 0;
      const accel = Math.hypot(ax, ay);

      const speed = Math.hypot(vx, vy);
      const x = worldToMeters(body.position.x);
      const y = worldToMeters(body.position.y);

      const ke = 0.5 * body.mass * speed * speed;
      const pe = body.mass * gravity * -y;
      const energy = ke + pe;
      const momentum = body.mass * speed;

      const impulse = clamp((last?.impulse ?? 0) + (body.mass * accel) * Math.max(0, dtSec), 0, 1e9);

      lastRef.current = { timeMs: now, vx, vy, impulse };
      const tSec = samplesRef.current.length > 0 ? samplesRef.current[samplesRef.current.length - 1]!.t + Math.max(0, dtSec) : 0;

      const samples = samplesRef.current;
      samples.push({ t: tSec, x, y, speed, accel, ke, pe, energy, momentum, impulse });
      if (samples.length > 600) samples.splice(0, samples.length - 600);

      raf = window.requestAnimationFrame(loop);
    };

    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [bodyId, engineRef, gravity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // background
      ctx.fillStyle = "rgba(2, 6, 23, 0.35)";
      ctx.fillRect(0, 0, rect.width, rect.height);

      const samples = samplesRef.current;
      if (samples.length < 2) {
        raf = window.requestAnimationFrame(draw);
        return;
      }

      const w = rect.width;
      const h = rect.height;
      const pad = 22;
      const left = pad;
      const right = w - pad;
      const top = pad;
      const bottom = h - pad;

      const t0 = samples[0]!.t;
      const t1 = samples[samples.length - 1]!.t;
      const dt = Math.max(1e-6, t1 - t0);

      const values = samples.map((s) => s[metric]);
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        raf = window.requestAnimationFrame(draw);
        return;
      }
      if (Math.abs(max - min) < 1e-6) {
        max += 1;
        min -= 1;
      }

      const yPad = (max - min) * 0.12;
      min -= yPad;
      max += yPad;

      // grid
      ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 4; i += 1) {
        const y = top + ((bottom - top) * i) / 4;
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
      }
      ctx.stroke();

      // axis labels
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.font = "11px ui-sans-serif, system-ui, -apple-system";
      ctx.fillText(`${metricLabel.label} (${metricLabel.unit})`, left, 14);
      ctx.fillText(`${fmt(max)}`, left, top - 4);
      ctx.fillText(`${fmt(min)}`, left, bottom + 14);
      ctx.fillText(`${fmt(t0)}s`, left, bottom + 14);
      ctx.fillText(`${fmt(t1)}s`, right - 42, bottom + 14);

      // line
      ctx.strokeStyle = "rgba(59, 130, 246, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < samples.length; i += 1) {
        const s = samples[i]!;
        const tx = (s.t - t0) / dt;
        const ty = (s[metric] - min) / (max - min);
        const x = left + tx * (right - left);
        const y = bottom - ty * (bottom - top);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [metric, metricLabel.label, metricLabel.unit]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/40 shadow-xl backdrop-blur">
      <header className="flex items-center justify-between gap-2 border-b border-slate-800/70 px-4 py-3">
        <div className="text-sm font-semibold text-slate-100">{t("graphs.title")}</div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <span className="text-slate-400">{t("graphs.metric")}</span>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricKey)}
              className="h-8 rounded-md border border-slate-800 bg-slate-950/60 px-2 text-xs text-slate-200 outline-none"
            >
              <option value="x">x(t) (m)</option>
              <option value="y">y(t) (m)</option>
              <option value="speed">|v|(t) (m/s)</option>
              <option value="accel">|a|(t) (m/s²)</option>
              <option value="ke">KE(t) (J)</option>
              <option value="pe">PE(t) (J)</option>
              <option value="energy">E(t) (J)</option>
              <option value="momentum">|p|(t) (kg·m/s)</option>
              <option value="impulse">|J|(t) (N·s)</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              samplesRef.current = [];
              lastRef.current = null;
            }}
            className={cn(
              "h-8 rounded-md border border-slate-800 bg-slate-950/40 px-2 text-xs text-slate-200 hover:bg-slate-900/50",
              !bodyId ? "opacity-60" : ""
            )}
            disabled={!bodyId}
          >
            {t("graphs.clear")}
          </button>
        </div>
      </header>

      <div className="p-3">
        {!bodyId ? (
          <div className="grid place-items-center rounded-lg border border-slate-800/60 bg-slate-950/40 p-6 text-xs text-slate-400">
            {t("graphs.empty")}
          </div>
        ) : (
          <div className="h-[240px] rounded-lg border border-slate-800/60 bg-slate-950/30">
            <canvas ref={canvasRef} className="h-full w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
