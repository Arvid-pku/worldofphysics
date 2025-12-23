"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Magnet, Trash2, Zap } from "lucide-react";

import { useSandbox } from "@/components/sandbox/SandboxContext";
import { normalizeAngleRad } from "@/lib/physics/fields";
import type { FieldRegion } from "@/lib/physics/types";
import { cn } from "@/lib/utils/cn";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
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
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="grid gap-1">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        {hint ? <span className="text-[11px] text-slate-600">{hint}</span> : null}
      </div>
      <input
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
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

function updateField(prev: FieldRegion[], next: FieldRegion) {
  return prev.map((f) => (f.id === next.id ? next : f));
}

export function FieldInspector({ fieldId }: { fieldId: string }) {
  const { fields, setFields, setSelected } = useSandbox();

  const field = useMemo(() => fields.find((f) => f.id === fieldId) ?? null, [fieldId, fields]);
  const [angleDeg, setAngleDeg] = useState(0);

  useEffect(() => {
    if (!field || field.kind !== "electric") return;
    setAngleDeg(Math.round((field.directionRad * 180) / Math.PI));
  }, [field]);

  if (!field) {
    return <div className="rounded-lg border border-slate-900 bg-slate-950/50 p-3 text-xs text-slate-400">Field not found.</div>;
  }

  const title = field.kind === "electric" ? "Electric Field" : "Magnetic Field";
  const badge = field.kind === "electric" ? <Zap className="h-3.5 w-3.5" /> : <Magnet className="h-3.5 w-3.5" />;

  const outline =
    field.kind === "electric" ? "border-blue-500/20 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]" : "border-emerald-500/20 shadow-[0_0_0_1px_rgba(34,197,94,0.15)]";

  return (
    <div>
      <div className={cn("rounded-xl border bg-slate-950/40 p-3", outline)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              {badge}
              <span>{title}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {field.shape === "rect" ? "Rectangular region" : "Circular region"}
            </div>
          </div>
          <button
            type="button"
            title="Delete field"
            onClick={() => {
              setFields((prev) => prev.filter((f) => f.id !== field.id));
              setSelected({ kind: "none" });
            }}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Section title="Region">
        {field.shape === "rect" ? (
          <div className="grid grid-cols-2 gap-3">
            <LabeledNumber
              label="Width"
              value={field.width ?? 0}
              onChange={(v) => setFields((prev) => updateField(prev, { ...field, width: Math.max(40, v) }))}
            />
            <LabeledNumber
              label="Height"
              value={field.height ?? 0}
              onChange={(v) => setFields((prev) => updateField(prev, { ...field, height: Math.max(40, v) }))}
            />
          </div>
        ) : (
          <LabeledNumber
            label="Radius"
            value={field.radius ?? 0}
            onChange={(v) => setFields((prev) => updateField(prev, { ...field, radius: Math.max(24, v) }))}
          />
        )}
      </Section>

      {field.kind === "electric" ? (
        <Section title="Vector" icon={<Zap className="h-3.5 w-3.5" />}>
          <div className="grid gap-3">
            <LabeledSlider
              label="Magnitude"
              value={field.magnitude}
              min={-5}
              max={5}
              step={0.01}
              onChange={(v) => setFields((prev) => updateField(prev, { ...field, magnitude: v }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <LabeledNumber
                label="Direction (deg)"
                hint="θ"
                value={angleDeg}
                onChange={(v) => {
                  const clamped = clamp(v, -360, 360);
                  setAngleDeg(clamped);
                  const rad = normalizeAngleRad((clamped * Math.PI) / 180);
                  setFields((prev) => updateField(prev, { ...field, directionRad: rad }));
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const deg = Math.round((field.directionRad * 180) / Math.PI);
                  setAngleDeg(deg);
                }}
                className="mt-6 h-9 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-200 hover:bg-slate-900/50"
              >
                From Field
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "→", deg: 0 },
                { label: "↑", deg: 270 },
                { label: "←", deg: 180 },
                { label: "↓", deg: 90 }
              ].map((p) => (
                <button
                  key={p.deg}
                  type="button"
                  onClick={() => {
                    setAngleDeg(p.deg);
                    setFields((prev) => updateField(prev, { ...field, directionRad: (p.deg * Math.PI) / 180 }));
                  }}
                  className="h-9 rounded-md border border-slate-800 bg-slate-950/40 text-sm text-slate-200 hover:bg-slate-900/50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </Section>
      ) : (
        <Section title="Strength" icon={<Magnet className="h-3.5 w-3.5" />}>
          <div className="grid gap-2">
            <LabeledSlider
              label="B (out/in of screen)"
              value={field.strength}
              min={-5}
              max={5}
              step={0.01}
              onChange={(v) => setFields((prev) => updateField(prev, { ...field, strength: v }))}
            />
            <div className="text-[11px] text-slate-500">
              Positive = out of screen (•), negative = into screen (×).
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
