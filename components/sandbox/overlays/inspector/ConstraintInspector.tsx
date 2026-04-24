"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Cable, Compass, Link2, Ruler, Trash2, Waves } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { ensureConstraintMeta, findConstraintByMetaId } from "@/lib/physics/constraintMeta";
import { captureConstraintState, type ConstraintState } from "@/lib/physics/constraintState";
import type { ConstraintKind, ConstraintMode } from "@/lib/physics/types";
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

function parseNum(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmt(n: number, digits = 3) {
  if (!Number.isFinite(n)) return "";
  return n.toFixed(digits);
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
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
  value: string;
  onChange: (v: string) => void;
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
  onPointerUp
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
}) {
  const pct = valueToPct(value, min, max);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-medium text-mute">{label}</span>
        <span className="font-mono text-[11.5px] tabular-nums text-white">{value.toFixed(2)}</span>
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

function kindIcon(kind: ConstraintKind) {
  if (kind === "spring") return <Waves className="h-3.5 w-3.5" />;
  if (kind === "rope" || kind === "rigid_rope") return <Cable className="h-3.5 w-3.5" />;
  return <Link2 className="h-3.5 w-3.5" />;
}

const KIND_ORDER: ConstraintKind[] = ["rod", "rope", "rigid_rope", "spring"];

export function ConstraintInspector({ constraintId }: { constraintId: string }) {
  const { t } = useI18n();
  const { engineRef, commitConstraintChange, deleteConstraintById } = useSandbox();

  const constraint = useMemo(() => {
    const engine = engineRef.current;
    if (!engine) return null;
    return findConstraintByMetaId(engine, constraintId);
  }, [constraintId, engineRef]);

  const [kind, setKind] = useState<ConstraintKind>("rod");
  const [mode, setMode] = useState<ConstraintMode>("distance");
  const [axisDeg, setAxisDeg] = useState("0");
  const [guide, setGuide] = useState(true);
  const [lengthM, setLengthM] = useState("0");
  const [stiffness, setStiffness] = useState(1);
  const [damping, setDamping] = useState(0);

  const editStartRef = useRef<ConstraintState | null>(null);
  const beginEdit = () => {
    if (!constraint) return;
    editStartRef.current = captureConstraintState(constraint);
  };
  const commitEdit = () => {
    if (!constraint) return;
    const before = editStartRef.current;
    if (!before) return;
    editStartRef.current = null;
    const after = captureConstraintState(constraint);
    if (!after) return;
    commitConstraintChange({ constraintId, before, after });
  };

  useEffect(() => {
    if (!constraint) return;
    const meta = ensureConstraintMeta(constraint);
    setKind(meta.kind);
    setMode(meta.mode ?? "distance");
    setAxisDeg(fmt((((meta.axisAngleRad ?? 0) * 180) / Math.PI) % 360, 1));
    setGuide(meta.guide ?? true);
    setLengthM(fmt(worldToMeters(meta.restLength), 3));
    setStiffness(meta.stiffness);
    setDamping(meta.damping);
  }, [constraint, constraintId]);

  const axisSpring = kind === "spring" && mode === "axis";

  const applyLength = (valueM: string) => {
    if (!constraint) return;
    const n = parseNum(valueM);
    if (!n || n <= 0) return;
    const next = metersToWorld(n);
    const meta = ensureConstraintMeta(constraint);
    meta.restLength = next;
    constraint.length = next;
  };

  const applyStiffness = (value: number) => {
    if (!constraint) return;
    const v = Math.min(1, Math.max(0, value));
    const meta = ensureConstraintMeta(constraint);
    meta.stiffness = v;
    if (!axisSpring) constraint.stiffness = v;
    setStiffness(v);
  };

  const applyDamping = (value: number) => {
    if (!constraint) return;
    const v = Math.min(1, Math.max(0, value));
    const meta = ensureConstraintMeta(constraint);
    meta.damping = v;
    if (!axisSpring) constraint.damping = v;
    setDamping(v);
  };

  const applyMode = (nextMode: ConstraintMode) => {
    if (!constraint) return;
    const meta = ensureConstraintMeta(constraint);
    meta.mode = nextMode;
    setMode(nextMode);
    if (kind === "spring" && nextMode === "axis") {
      meta.guide = meta.guide ?? true;
      setGuide(meta.guide);
      const a = constraint.bodyA ? { x: constraint.bodyA.position.x + (constraint.pointA?.x ?? 0), y: constraint.bodyA.position.y + (constraint.pointA?.y ?? 0) } : constraint.pointA;
      const b = constraint.bodyB ? { x: constraint.bodyB.position.x + (constraint.pointB?.x ?? 0), y: constraint.bodyB.position.y + (constraint.pointB?.y ?? 0) } : constraint.pointB;
      if (a && b) {
        const angle = Math.atan2(a.y - b.y, a.x - b.x);
        meta.axisAngleRad = angle;
        setAxisDeg(fmt(((angle * 180) / Math.PI) % 360, 1));
        meta.restLength = Math.hypot(a.x - b.x, a.y - b.y);
        constraint.length = meta.restLength;
      }
      constraint.stiffness = 0;
      constraint.damping = 0;
    } else {
      constraint.stiffness = meta.stiffness;
      constraint.damping = meta.damping;
      constraint.length = meta.restLength;
    }
  };

  const applyAxisDeg = (degStr: string) => {
    if (!constraint) return;
    const deg = parseNum(degStr);
    if (deg === null) return;
    const rad = (deg * Math.PI) / 180;
    const meta = ensureConstraintMeta(constraint);
    meta.axisAngleRad = rad;
  };

  const applyGuide = (value: boolean) => {
    if (!constraint) return;
    const meta = ensureConstraintMeta(constraint);
    meta.guide = value;
    setGuide(value);
  };

  if (!constraint) {
    return (
      <div className="surface rounded-xl p-3 text-[12px] text-mute">
        {t("constraint.notFound")}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {/* Type / Kind summary */}
      <SectionCard
        title={t("constraint.title")}
        icon={kindIcon(kind)}
        accent="spark"
      >
        <div className="grid gap-2.5">
          <FieldLabel label={t("constraint.kind")} />
          <div className="flex flex-wrap gap-1.5">
            {KIND_ORDER.map((k) => {
              const active = k === kind;
              return (
                <span
                  key={k}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11.5px] font-medium",
                    active
                      ? "border-transparent bg-spark-500/15 text-spark-200 ring-1 ring-spark-400/40"
                      : "border-white/[0.06] bg-white/[0.02] text-mute"
                  )}
                >
                  <span className={active ? "text-spark-200" : "text-mute-2"}>
                    {kindIcon(k)}
                  </span>
                  {t(`constraint.kind.${k}` as any)}
                </span>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Spring mode (only when spring) */}
      {kind === "spring" ? (
        <SectionCard
          title={t("constraint.mode")}
          icon={<Compass className="h-3 w-3" />}
          accent="violet"
        >
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
              {(["distance", "axis"] as ConstraintMode[]).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      if (active) return;
                      beginEdit();
                      applyMode(m);
                      commitEdit();
                    }}
                    className={cn(
                      "h-7 rounded-full text-[11.5px] font-medium transition",
                      active
                        ? "bg-spark-500/15 text-spark-200 ring-1 ring-spark-400/40"
                        : "text-mute hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    {t(`constraint.mode.${m}` as any)}
                  </button>
                );
              })}
            </div>

            {mode === "axis" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <LabeledNumber
                  label={t("constraint.axisDirection")}
                  unit="°"
                  value={axisDeg}
                  onChange={setAxisDeg}
                  onFocus={beginEdit}
                  onBlur={() => {
                    applyAxisDeg(axisDeg);
                    commitEdit();
                  }}
                />
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition hover:bg-white/[0.04]">
                  <span className="text-[12.5px] font-medium text-white">{t("constraint.guide")}</span>
                  <input
                    type="checkbox"
                    checked={guide}
                    onChange={(e) => {
                      beginEdit();
                      applyGuide(e.target.checked);
                      commitEdit();
                    }}
                    className="wop-check shrink-0"
                  />
                </label>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {/* Length & Stiffness */}
      <SectionCard
        title={t("constraint.length")}
        icon={<Ruler className="h-3 w-3" />}
        accent="plasma"
      >
        <div className="grid gap-3">
          <LabeledNumber
            label={t("constraint.length")}
            unit="m"
            value={lengthM}
            onChange={setLengthM}
            onFocus={beginEdit}
            onBlur={() => {
              applyLength(lengthM);
              commitEdit();
            }}
          />

          <LabeledSlider
            label={t("constraint.stiffness")}
            value={stiffness}
            min={0}
            max={1}
            step={0.01}
            onChange={applyStiffness}
            onPointerDown={beginEdit}
            onPointerUp={commitEdit}
          />
          <LabeledSlider
            label={t("constraint.damping")}
            value={damping}
            min={0}
            max={1}
            step={0.01}
            onChange={applyDamping}
            onPointerDown={beginEdit}
            onPointerUp={commitEdit}
          />
        </div>
      </SectionCard>

      {/* Delete */}
      <button
        type="button"
        onClick={() => deleteConstraintById(constraintId)}
        className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12.5px] font-medium text-bad-400 transition hover:bg-bad-500/10 hover:border-bad-500/30"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("constraint.delete")}
      </button>
    </div>
  );
}
