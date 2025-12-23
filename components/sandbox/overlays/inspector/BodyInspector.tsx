"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as Matter from "matter-js";
import { RotateCw, Shield, Zap } from "lucide-react";

import { useSandbox } from "@/components/sandbox/SandboxContext";
import { ensureBodyMeta, findBodyByMetaId } from "@/lib/physics/bodyMeta";
import type { ChargeDistribution } from "@/lib/physics/types";
import { cn } from "@/lib/utils/cn";

type TriadKey = "mass" | "density" | "volume";
type Triad = Record<TriadKey, string>;

function parseNum(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmt(n: number, digits = 3) {
  if (!Number.isFinite(n)) return "";
  return n.toFixed(digits);
}

function computeTriad(next: Triad, edited: TriadKey): Triad {
  const m = parseNum(next.mass);
  const d = parseNum(next.density);
  const v = parseNum(next.volume);

  if (edited === "mass" && m && m > 0) {
    if (d && d > 0) return { ...next, volume: fmt(m / d) };
    if (v && v > 0) return { ...next, density: fmt(m / v) };
  }

  if (edited === "density" && d && d > 0) {
    if (v && v > 0) return { ...next, mass: fmt(d * v) };
    if (m && m > 0) return { ...next, volume: fmt(m / d) };
  }

  if (edited === "volume" && v && v > 0) {
    if (d && d > 0) return { ...next, mass: fmt(d * v) };
    if (m && m > 0) return { ...next, density: fmt(m / v) };
  }

  return next;
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {icon}
        <span>{title}</span>
      </div>
      <div className="mt-2 rounded-xl border border-slate-800/70 bg-slate-950/40 p-3">{children}</div>
    </section>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
  hint
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="grid gap-1">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        {hint ? <span className="text-[11px] text-slate-600">{hint}</span> : null}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className="h-9 w-full rounded-md border border-slate-800 bg-slate-950/50 px-2 text-sm text-slate-100 outline-none focus:border-blue-500/50"
      />
    </label>
  );
}

function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums text-slate-300">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-blue-500"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2">
      <span className="text-xs text-slate-300">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-blue-500"
      />
    </label>
  );
}

export function BodyInspector({ bodyId }: { bodyId: string }) {
  const { engineRef } = useSandbox();

  const body = useMemo(() => {
    const engine = engineRef.current;
    if (!engine) return null;
    return findBodyByMetaId(engine, bodyId);
  }, [bodyId, engineRef]);

  const [label, setLabel] = useState("");
  const [triad, setTriad] = useState<Triad>({ mass: "", density: "", volume: "" });

  const [restitution, setRestitution] = useState(0.25);
  const [friction, setFriction] = useState(0.12);
  const [frictionStatic, setFrictionStatic] = useState(0.5);

  const [isCharged, setIsCharged] = useState(false);
  const [charge, setCharge] = useState("0");
  const [distribution, setDistribution] = useState<ChargeDistribution>("point");

  const [velX, setVelX] = useState("0");
  const [velY, setVelY] = useState("0");
  const [angVel, setAngVel] = useState("0");

  useEffect(() => {
    if (!body) return;
    const meta = ensureBodyMeta(body);
    setLabel(meta.label);
    setTriad({
      mass: fmt(body.mass, 3),
      density: fmt(meta.density, 3),
      volume: fmt(meta.volume, 3)
    });
    setRestitution(body.restitution);
    setFriction(body.friction);
    setFrictionStatic(body.frictionStatic);
    setIsCharged(meta.isCharged);
    setCharge(String(meta.charge));
    setDistribution(meta.chargeDistribution);
    setVelX(fmt(body.velocity.x, 3));
    setVelY(fmt(body.velocity.y, 3));
    setAngVel(fmt(body.angularVelocity, 3));
  }, [bodyId, body]);

  if (!body) {
    return <div className="rounded-lg border border-slate-900 bg-slate-950/50 p-3 text-xs text-slate-400">Body not found.</div>;
  }

  const meta = ensureBodyMeta(body);

  const onTriadChange = (key: TriadKey, value: string) => {
    const next = computeTriad({ ...triad, [key]: value }, key);
    setTriad(next);

    const mass = parseNum(next.mass);
    const density = parseNum(next.density);
    const volume = parseNum(next.volume);

    if (mass && mass > 0) Matter.Body.setMass(body, mass);
    if (density && density > 0) meta.density = density;
    if (volume && volume > 0) meta.volume = volume;
  };

  const glow = isCharged && Number(charge) !== 0;
  const glowClass =
    glow && Number(charge) > 0 ? "shadow-glowBlue border-blue-500/30" : glow ? "shadow-glowRed border-red-500/30" : "";

  return (
    <div>
      <div className={cn("rounded-xl border border-slate-800/70 bg-slate-950/40 p-3", glowClass)}>
        <div className="text-xs text-slate-500">Label</div>
        <input
          value={label}
          onChange={(e) => {
            const v = e.target.value;
            setLabel(v);
            meta.label = v;
          }}
          className="mt-1 h-9 w-full rounded-md border border-slate-800 bg-slate-950/50 px-2 text-sm text-slate-100 outline-none focus:border-blue-500/50"
        />
      </div>

      <Section title="Mass / Density / Volume" icon={<Shield className="h-3.5 w-3.5" />}>
        <div className="grid grid-cols-3 gap-3">
          <LabeledNumber label="Mass" hint="m" value={triad.mass} onChange={(v) => onTriadChange("mass", v)} />
          <LabeledNumber label="Density" hint="ρ" value={triad.density} onChange={(v) => onTriadChange("density", v)} />
          <LabeledNumber label="Volume" hint="V" value={triad.volume} onChange={(v) => onTriadChange("volume", v)} />
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          Tip: Enter any two values to auto-calculate the third.
        </div>
      </Section>

      <Section title="Material" icon={<RotateCw className="h-3.5 w-3.5" />}>
        <div className="grid gap-3">
          <LabeledSlider
            label="Restitution"
            value={restitution}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => {
              setRestitution(v);
              body.restitution = v;
            }}
          />
          <LabeledSlider
            label="Friction (Kinetic)"
            value={friction}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => {
              setFriction(v);
              body.friction = v;
            }}
          />
          <LabeledSlider
            label="Friction (Static)"
            value={frictionStatic}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => {
              setFrictionStatic(v);
              body.frictionStatic = v;
            }}
          />
        </div>
      </Section>

      <Section title="Electromagnetism" icon={<Zap className="h-3.5 w-3.5" />}>
        <div className="grid gap-3">
          <Toggle
            label="Is Charged"
            checked={isCharged}
            onChange={(v) => {
              setIsCharged(v);
              meta.isCharged = v;
            }}
          />

          <LabeledNumber
            label="Charge (q)"
            value={charge}
            onChange={(v) => {
              setCharge(v);
              const q = parseNum(v);
              meta.charge = q ?? 0;
            }}
            hint="±"
          />

          <label className="grid gap-1">
            <div className="text-xs text-slate-400">Distribution</div>
            <select
              value={distribution}
              onChange={(e) => {
                const v = e.target.value as ChargeDistribution;
                setDistribution(v);
                meta.chargeDistribution = v;
              }}
              className="h-9 w-full rounded-md border border-slate-800 bg-slate-950/50 px-2 text-sm text-slate-100 outline-none focus:border-blue-500/50"
            >
              <option value="point">Point</option>
              <option value="uniform">Uniform</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title="Kinematics">
        <div className="grid grid-cols-3 gap-3">
          <LabeledNumber label="Vel X" value={velX} onChange={setVelX} />
          <LabeledNumber label="Vel Y" value={velY} onChange={setVelY} />
          <LabeledNumber label="Ang Vel" value={angVel} onChange={setAngVel} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const vx = parseNum(velX);
              const vy = parseNum(velY);
              const w = parseNum(angVel);
              if (vx !== null && vy !== null) Matter.Body.setVelocity(body, { x: vx, y: vy });
              if (w !== null) Matter.Body.setAngularVelocity(body, w);
            }}
            className="h-9 flex-1 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-200 hover:bg-slate-900/50"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setVelX("0");
              setVelY("0");
              setAngVel("0");
              Matter.Body.setVelocity(body, { x: 0, y: 0 });
              Matter.Body.setAngularVelocity(body, 0);
            }}
            className="h-9 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-200 hover:bg-slate-900/50"
          >
            Zero
          </button>
        </div>
      </Section>
    </div>
  );
}
