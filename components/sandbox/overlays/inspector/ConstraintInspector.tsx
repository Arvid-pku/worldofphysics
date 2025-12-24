"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { ensureConstraintMeta, findConstraintByMetaId } from "@/lib/physics/constraintMeta";
import { captureConstraintState, type ConstraintState } from "@/lib/physics/constraintState";
import type { ConstraintKind, ConstraintMode } from "@/lib/physics/types";
import { metersToWorld, worldToMeters } from "@/lib/physics/units";

function parseNum(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmt(n: number, digits = 3) {
  if (!Number.isFinite(n)) return "";
  return n.toFixed(digits);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{title}</div>
      <div className="mt-2 rounded-xl border border-slate-800/70 bg-slate-950/40 p-3">{children}</div>
    </section>
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
    <label className="grid gap-1">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        {unit ? <span className="text-[11px] text-slate-600">{unit}</span> : null}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
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
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="h-2 w-full cursor-pointer accent-blue-500"
      />
    </div>
  );
}

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
      <div className="rounded-lg border border-slate-900 bg-slate-950/50 p-3 text-xs text-slate-400">
        {t("constraint.notFound")}
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <Section title={t("constraint.title")}>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t("constraint.kind")}</span>
              <span className="text-slate-200">{t(`constraint.kind.${kind}`)}</span>
            </div>
          </div>

          {kind === "spring" ? (
            <div className="grid gap-3">
              <label className="grid gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{t("constraint.mode")}</span>
                </div>
                <select
                  value={mode}
                  onChange={(e) => {
                    beginEdit();
                    applyMode(e.target.value as ConstraintMode);
                    commitEdit();
                  }}
                  className="h-9 w-full rounded-md border border-slate-800 bg-slate-950/50 px-2 text-sm text-slate-100 outline-none focus:border-blue-500/50"
                >
                  <option value="distance">{t("constraint.mode.distance")}</option>
                  <option value="axis">{t("constraint.mode.axis")}</option>
                </select>
              </label>

              {mode === "axis" ? (
                <div className="grid gap-3 sm:grid-cols-2">
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
                  <label className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
                    <span className="text-xs text-slate-300">{t("constraint.guide")}</span>
                    <input
                      type="checkbox"
                      checked={guide}
                      onChange={(e) => {
                        beginEdit();
                        applyGuide(e.target.checked);
                        commitEdit();
                      }}
                      className="h-4 w-4 accent-blue-500"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>

          <div className="grid gap-3">
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

          <button
            type="button"
            onClick={() => deleteConstraintById(constraintId)}
            className="mt-1 h-9 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 text-xs text-rose-200 hover:bg-rose-500/15"
          >
            {t("constraint.delete")}
          </button>
        </div>
      </Section>
    </div>
  );
}
