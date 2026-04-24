"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Compass, Crop, Magnet, Square, Trash2, Zap } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { normalizeAngleRad } from "@/lib/physics/fields";
import type { FieldRegion } from "@/lib/physics/types";
import { metersToWorld, worldToMeters } from "@/lib/physics/units";
import { cn } from "@/lib/utils/cn";

type Accent = "spark" | "ember" | "violet" | "plasma" | "ok";

const ACCENT_RING: Record<Accent, string> = {
  spark: "bg-spark-500/10 ring-spark-400/30 text-spark-200",
  ember: "bg-ember-500/10 ring-ember-400/30 text-ember-300",
  violet: "bg-violet2-500/10 ring-violet2-400/30 text-violet2-400",
  plasma: "bg-plasma-500/10 ring-plasma-400/30 text-plasma-300",
  ok: "bg-ok-500/10 ring-ok-400/30 text-ok-400"
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function valueToPct(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
}

function SectionCard({
  title,
  icon,
  accent = "spark",
  children
}: {
  title: string;
  icon?: React.ReactNode;
  accent?: Accent;
  children: React.ReactNode;
}) {
  return (
    <section className="surface rounded-2xl p-3.5">
      <div className="mb-3 flex items-center gap-2">
        {icon ? (
          <span className={cn("grid h-5 w-5 place-items-center rounded ring-1", ACCENT_RING[accent])}>
            {icon}
          </span>
        ) : null}
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-mute-2">
          {title}
        </span>
        <span className="ml-2 h-px flex-1 bg-white/[0.06]" />
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ label, unit }: { label: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11.5px] font-medium text-mute">{label}</span>
      {unit ? (
        <span className="font-mono text-[10px] uppercase tracking-wide text-mute-2">{unit}</span>
      ) : null}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  onFocus,
  onBlur
}: {
  value: number;
  onChange: (v: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <input
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      onFocus={onFocus}
      onBlur={onBlur}
      inputMode="decimal"
      className="surface h-9 w-full rounded-lg border-transparent bg-white/[0.02] px-2.5 font-mono text-[12.5px] tabular-nums text-white outline-none transition focus:ring-1 focus:ring-spark-400/40"
    />
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  unit
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  unit?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <FieldLabel label={label} unit={unit} />
      <NumberInput value={value} onChange={onChange} onFocus={onFocus} onBlur={onBlur} />
    </label>
  );
}

function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onPointerDown,
  onPointerUp,
  unit
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  unit?: string;
}) {
  const pct = valueToPct(value, min, max);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-medium text-mute">{label}</span>
        <span className="font-mono text-[11.5px] tabular-nums text-white">
          {value.toFixed(2)}
          {unit ? <span className="ml-1 text-[10px] text-mute-2">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{ ["--val" as string]: `${pct}%` } as React.CSSProperties}
        className="w-full cursor-pointer"
      />
    </div>
  );
}

function updateField(prev: FieldRegion[], next: FieldRegion) {
  return prev.map((f) => (f.id === next.id ? next : f));
}

export function FieldInspector({ fieldId }: { fieldId: string }) {
  const { t } = useI18n();
  const { fields, setFields, deleteFieldById, commitFieldChange } = useSandbox();

  const field = useMemo(() => fields.find((f) => f.id === fieldId) ?? null, [fieldId, fields]);
  const [angleDeg, setAngleDeg] = useState(0);
  const editStartRef = useRef<FieldRegion | null>(null);

  const beginEdit = () => {
    if (!field) return;
    editStartRef.current = { ...field } as FieldRegion;
  };

  const commitEdit = () => {
    if (!field) return;
    const before = editStartRef.current;
    if (!before) return;
    editStartRef.current = null;
    const after = { ...field } as FieldRegion;
    commitFieldChange({ fieldId: field.id, before, after });
  };

  useEffect(() => {
    if (!field || field.kind !== "electric") return;
    setAngleDeg(Math.round((field.directionRad * 180) / Math.PI));
  }, [field]);

  if (!field) {
    return (
      <div className="surface rounded-xl p-3 text-[12px] text-mute">
        {t("field.notFound")}
      </div>
    );
  }

  const isElectric = field.kind === "electric";
  const accent: Accent = isElectric ? "spark" : "ok";
  const headerIcon = isElectric ? <Zap className="h-4 w-4" /> : <Magnet className="h-4 w-4" />;
  const title = isElectric ? t("field.electric") : t("field.magnetic");
  const shapeText = field.shape === "rect" ? t("field.shapeRect") : t("field.shapeCircle");

  return (
    <div className="grid gap-3">
      {/* Identity / Kind header */}
      <section className="surface relative overflow-hidden rounded-2xl p-3.5">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent opacity-70",
            isElectric ? "from-spark-500/15" : "from-ok-500/15"
          )}
        />
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1",
                ACCENT_RING[accent]
              )}
            >
              {headerIcon}
            </span>
            <div className="min-w-0">
              <div className="font-display text-[14px] font-semibold leading-tight text-white">
                {title}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-mute">
                {field.shape === "rect" ? (
                  <Square className="h-3 w-3" />
                ) : (
                  <Crop className="h-3 w-3" />
                )}
                <span>{shapeText}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            title={t("field.delete")}
            aria-label={t("field.delete")}
            onClick={() => deleteFieldById(field.id)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-bad-400 transition hover:border-bad-500/30 hover:bg-bad-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Region */}
      <SectionCard
        title={t("section.region")}
        icon={field.shape === "rect" ? <Square className="h-3 w-3" /> : <Crop className="h-3 w-3" />}
        accent="violet"
      >
        {field.shape === "rect" ? (
          <div className="grid grid-cols-2 gap-2">
            <LabeledNumber
              label={t("region.width")}
              unit="m"
              value={worldToMeters(field.width ?? 0)}
              onFocus={beginEdit}
              onChange={(v) =>
                setFields((prev) => updateField(prev, { ...field, width: Math.max(40, metersToWorld(v)) }))
              }
              onBlur={commitEdit}
            />
            <LabeledNumber
              label={t("region.height")}
              unit="m"
              value={worldToMeters(field.height ?? 0)}
              onFocus={beginEdit}
              onChange={(v) =>
                setFields((prev) => updateField(prev, { ...field, height: Math.max(40, metersToWorld(v)) }))
              }
              onBlur={commitEdit}
            />
          </div>
        ) : (
          <LabeledNumber
            label={t("region.radius")}
            unit="m"
            value={worldToMeters(field.radius ?? 0)}
            onFocus={beginEdit}
            onChange={(v) =>
              setFields((prev) => updateField(prev, { ...field, radius: Math.max(24, metersToWorld(v)) }))
            }
            onBlur={commitEdit}
          />
        )}
      </SectionCard>

      {/* Strength / Vector */}
      {isElectric ? (
        <SectionCard
          title={t("section.vector")}
          icon={<Zap className="h-3 w-3" />}
          accent="spark"
        >
          <div className="grid gap-3">
            <LabeledSlider
              label={t("field.magnitude")}
              value={field.magnitude}
              min={-5}
              max={5}
              step={0.01}
              unit="N/C"
              onPointerDown={beginEdit}
              onChange={(v) => setFields((prev) => updateField(prev, { ...field, magnitude: v }))}
              onPointerUp={commitEdit}
            />

            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <LabeledNumber
                label={t("field.direction")}
                unit="°"
                value={angleDeg}
                onFocus={beginEdit}
                onChange={(v) => {
                  const clamped = clamp(v, -360, 360);
                  setAngleDeg(clamped);
                  const rad = normalizeAngleRad((clamped * Math.PI) / 180);
                  setFields((prev) => updateField(prev, { ...field, directionRad: rad }));
                }}
                onBlur={commitEdit}
              />
              <button
                type="button"
                onClick={() => {
                  const deg = Math.round((field.directionRad * 180) / Math.PI);
                  setAngleDeg(deg);
                }}
                className="btn-ghost flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px]"
              >
                <Compass className="h-3.5 w-3.5" />
                {t("field.fromField")}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "→", deg: 0 },
                { label: "↑", deg: 270 },
                { label: "←", deg: 180 },
                { label: "↓", deg: 90 }
              ].map((p) => {
                const active = ((angleDeg % 360) + 360) % 360 === p.deg;
                return (
                  <button
                    key={p.deg}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      const before = { ...field } as FieldRegion;
                      const after = { ...field, directionRad: (p.deg * Math.PI) / 180 } as FieldRegion;
                      setAngleDeg(p.deg);
                      commitFieldChange({ fieldId: field.id, before, after });
                    }}
                    className={cn(
                      "h-9 rounded-lg border text-[14px] font-mono transition",
                      active
                        ? "border-transparent bg-spark-500/15 text-spark-200 ring-1 ring-spark-400/40"
                        : "border-white/[0.06] bg-white/[0.02] text-mute hover:bg-white/[0.05] hover:text-white"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title={t("section.strength")}
          icon={<Magnet className="h-3 w-3" />}
          accent="ok"
        >
          <div className="grid gap-2">
            <LabeledSlider
              label={t("field.bField")}
              value={field.strength}
              min={-5}
              max={5}
              step={0.01}
              unit="T"
              onPointerDown={beginEdit}
              onChange={(v) => setFields((prev) => updateField(prev, { ...field, strength: v }))}
              onPointerUp={commitEdit}
            />
            <div className="text-[10.5px] leading-snug text-mute-2">{t("field.bHint")}</div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
