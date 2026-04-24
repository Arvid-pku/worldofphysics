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
  const { engineRef, selected, gravity, referenceFrameBodyId } = useSandbox();

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
    simTimeMs: number;
    vx: number;
    vy: number;
    pX0: number;
    pY0: number;
  } | null>(null);

  useEffect(() => {
    samplesRef.current = [];
    lastRef.current = null;
  }, [bodyId, referenceFrameBodyId]);

  useEffect(() => {
    let raf = 0;

    const loop = () => {
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

      // Use simulation time, not wall-clock — so pausing doesn't fill the graph
      // with flat samples and the X axis shows real physics time.
      const simTimeMs = engine.timing.timestamp ?? 0;
      // If the engine was reset (simTime went backwards), clear our state so
      // we start a fresh sample buffer rather than waiting for sim time to
      // catch back up to the old recorded value.
      if (lastRef.current && simTimeMs + 1 < lastRef.current.simTimeMs) {
        lastRef.current = null;
        samplesRef.current = [];
      }

      let frameX = 0;
      let frameY = 0;
      let frameVx = 0;
      let frameVy = 0;
      if (referenceFrameBodyId) {
        const frameBody = findBodyByMetaId(engine, referenceFrameBodyId);
        if (frameBody) {
          frameX = frameBody.position.x;
          frameY = frameBody.position.y;
          frameVx = worldVelocityStepToMps(frameBody.velocity.x);
          frameVy = worldVelocityStepToMps(frameBody.velocity.y);
        }
      }

      const vx = worldVelocityStepToMps(body.velocity.x) - frameVx;
      const vy = worldVelocityStepToMps(body.velocity.y) - frameVy;

      const last = lastRef.current;
      const dtSimSec = last ? Math.max(0, (simTimeMs - last.simTimeMs) / 1000) : 0;
      // Skip sample if simulation hasn't advanced (e.g., paused).
      if (last && dtSimSec <= 1e-6) {
        raf = window.requestAnimationFrame(loop);
        return;
      }

      const ax = last && dtSimSec > 0 ? (vx - last.vx) / dtSimSec : 0;
      const ay = last && dtSimSec > 0 ? (vy - last.vy) / dtSimSec : 0;
      const accel = Math.hypot(ax, ay);

      const speed = Math.hypot(vx, vy);
      const x = worldToMeters(body.position.x - frameX);
      // Convert canvas-y to "height": y axis points down on screen, so height
      // above the origin is -y. PE uses gravity (could be negative) and height.
      const yMeters = worldToMeters(body.position.y - frameY);
      const height = -yMeters;

      const ke = 0.5 * body.mass * speed * speed;
      // PE = m·g·h. With gravity negative (e.g., upward), PE inverts properly.
      const pe = body.mass * gravity * height;
      const energy = ke + pe;
      // Momentum scalar — magnitude of the velocity-vector momentum.
      const momentum = body.mass * speed;

      // Impulse since first sample = magnitude of momentum change vector.
      // |Δp| = |m·v(t) − m·v(0)|. Bounded — stops growing once velocity stops
      // changing — instead of the previous unbounded ∫|F|dt running sum.
      const pX = body.mass * vx;
      const pY = body.mass * vy;
      const pX0 = last?.pX0 ?? pX;
      const pY0 = last?.pY0 ?? pY;
      const impulse = clamp(Math.hypot(pX - pX0, pY - pY0), 0, 1e9);

      lastRef.current = { simTimeMs, vx, vy, pX0, pY0 };
      const tSec = simTimeMs / 1000;

      const samples = samplesRef.current;
      samples.push({ t: tSec, x, y: yMeters, speed, accel, ke, pe, energy, momentum, impulse });
      if (samples.length > 600) samples.splice(0, samples.length - 600);

      raf = window.requestAnimationFrame(loop);
    };

    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [bodyId, engineRef, gravity, referenceFrameBodyId]);

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
      const bg = ctx.createLinearGradient(0, 0, 0, rect.height);
      bg.addColorStop(0, "rgba(14, 21, 48, 0.55)");
      bg.addColorStop(1, "rgba(5, 7, 15, 0.55)");
      ctx.fillStyle = bg;
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
      ctx.strokeStyle = "rgba(180, 200, 255, 0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 4; i += 1) {
        const y = top + ((bottom - top) * i) / 4;
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
      }
      ctx.stroke();

      // zero baseline if visible
      if (min < 0 && max > 0) {
        const zeroY = bottom - (-min / (max - min)) * (bottom - top);
        ctx.strokeStyle = "rgba(255,255,255,0.20)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(left, zeroY);
        ctx.lineTo(right, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // axis labels — value range on right, time on bottom
      ctx.fillStyle = "rgba(166, 177, 216, 0.75)";
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${fmt(max)}`, right - 4, top + 10);
      ctx.fillText(`${fmt(min)}`, right - 4, bottom - 2);
      ctx.textAlign = "left";
      ctx.fillText(`${fmt(t0)}s`, left, bottom + 14);
      ctx.textAlign = "right";
      ctx.fillText(`${fmt(t1)}s`, right, bottom + 14);
      ctx.textAlign = "left";

      // Filled area under line
      const areaGrad = ctx.createLinearGradient(0, top, 0, bottom);
      areaGrad.addColorStop(0, "rgba(60, 223, 255, 0.30)");
      areaGrad.addColorStop(1, "rgba(60, 223, 255, 0.0)");
      ctx.fillStyle = areaGrad;
      ctx.beginPath();
      for (let i = 0; i < samples.length; i += 1) {
        const s = samples[i]!;
        const tx = (s.t - t0) / dt;
        const ty = (s[metric] - min) / (max - min);
        const x = left + tx * (right - left);
        const y = bottom - ty * (bottom - top);
        if (i === 0) ctx.moveTo(x, bottom);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(right, bottom);
      ctx.closePath();
      ctx.fill();

      // line
      const lineGrad = ctx.createLinearGradient(left, 0, right, 0);
      lineGrad.addColorStop(0, "#3D97FF");
      lineGrad.addColorStop(1, "#15CDF5");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.8;
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

      // Live point dot
      const lastSample = samples[samples.length - 1]!;
      const ltx = (lastSample.t - t0) / dt;
      const lty = (lastSample[metric] - min) / (max - min);
      const lx = left + ltx * (right - left);
      const ly = bottom - lty * (bottom - top);
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(60,223,255,0.8)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [metric, metricLabel.label, metricLabel.unit]);

  const METRIC_OPTIONS: { value: MetricKey; label: string; group: string }[] = [
    { value: "x", label: "x(t)  m", group: "Position" },
    { value: "y", label: "y(t)  m", group: "Position" },
    { value: "speed", label: "|v|(t)  m/s", group: "Motion" },
    { value: "accel", label: "|a|(t)  m/s²", group: "Motion" },
    { value: "ke", label: "KE(t)  J", group: "Energy" },
    { value: "pe", label: "PE(t)  J", group: "Energy" },
    { value: "energy", label: "E(t)  J", group: "Energy" },
    { value: "momentum", label: "|p|(t)  kg·m/s", group: "Dynamics" },
    { value: "impulse", label: "|J|(t)  N·s", group: "Dynamics" }
  ];

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1">
          {METRIC_OPTIONS.slice(0, 4).map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMetric(m.value)}
              className={cn(
                "h-7 rounded-full px-2.5 font-mono text-[10.5px] font-medium transition",
                metric === m.value
                  ? "bg-plasma-500/15 text-plasma-300 ring-1 ring-plasma-400/40"
                  : "text-mute hover:bg-white/[0.04] hover:text-white"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as MetricKey)}
          className="surface h-7 rounded-md border border-white/[0.08] bg-white/[0.02] px-1.5 font-mono text-[10.5px] text-white outline-none"
          aria-label={t("graphs.metric")}
        >
          {METRIC_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </header>

      <div className="p-3">
        {!bodyId ? (
          <div className="surface grid place-items-center rounded-xl px-4 py-10 text-center text-[12px] text-mute">
            <div className="font-display text-[14px] font-semibold text-white">
              {t("graphs.empty")}
            </div>
            <div className="mt-1 text-[11px] text-mute-2">
              Click a body on the canvas to start sampling.
            </div>
          </div>
        ) : (
          <div className="relative h-[230px] overflow-hidden rounded-xl bg-white/[0.02] ring-1 ring-white/[0.05]">
            <canvas ref={canvasRef} className="h-full w-full" />
            <button
              type="button"
              onClick={() => {
                samplesRef.current = [];
                lastRef.current = null;
              }}
              className="absolute right-2 top-2 rounded-md bg-white/[0.04] px-2 py-1 text-[10.5px] text-mute hover:bg-white/[0.08] hover:text-white"
            >
              {t("graphs.clear")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
