"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Matter from "matter-js";
import { MoveRight, RotateCw, Shield, Zap } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { ensureBodyMeta, findBodyByMetaId } from "@/lib/physics/bodyMeta";
import { captureBodyState } from "@/lib/physics/bodyState";
import { ensureConveyorMeta, getConveyorMeta, setConveyorMeta } from "@/lib/physics/conveyor";
import type { ChargeDistribution } from "@/lib/physics/types";
import {
  BASE_DELTA_MS,
  mpsToWorldVelocityBaseStep,
  radpsToWorldAngularVelocityBaseStep,
  worldAngularVelocityStepToRadps,
  worldVelocityStepToMps
} from "@/lib/physics/units";
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
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums text-slate-300">
          {value.toFixed(2)}
          {unit ? ` ${unit}` : ""}
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
        className="h-2 w-full cursor-pointer accent-blue-500"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2",
        disabled ? "pointer-events-none opacity-40" : ""
      )}
    >
      <span className="text-xs text-slate-300">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-blue-500"
        disabled={disabled}
      />
    </label>
  );
}

export function BodyInspector({ bodyId }: { bodyId: string }) {
  const { t } = useI18n();
  const {
    engineRef,
    commitBodyStateChange,
    referenceFrameBodyId,
    setReferenceFrameBodyId,
    referenceFrameFollow,
    setReferenceFrameFollow
  } = useSandbox();

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

  const [conveyorEnabled, setConveyorEnabled] = useState(false);
  const [conveyorSpeed, setConveyorSpeed] = useState(2);
  const [conveyorGrip, setConveyorGrip] = useState(0.28);

  const editStartRef = useRef<ReturnType<typeof captureBodyState> | null>(null);
  const beginPropsEdit = () => {
    if (!body) return;
    editStartRef.current = captureBodyState(body);
  };
  const commitPropsEdit = () => {
    if (!body) return;
    const before = editStartRef.current;
    if (!before) return;
    editStartRef.current = null;
    const after = captureBodyState(body);
    commitBodyStateChange({ bodyId, before, after, apply: { transform: false, shape: false, kinematics: false } });
  };
  const commitKinematicsEdit = (before: ReturnType<typeof captureBodyState>) => {
    if (!body) return;
    const after = captureBodyState(body);
    commitBodyStateChange({ bodyId, before, after, apply: { transform: false, shape: false, kinematics: true } });
  };

  useEffect(() => {
    if (!body) return;
    const meta = ensureBodyMeta(body);
    const conveyor = getConveyorMeta(body);
    const dtMs = (body as any).deltaTime || BASE_DELTA_MS;
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
    setVelX(fmt(worldVelocityStepToMps(body.velocity.x, dtMs), 3));
    setVelY(fmt(worldVelocityStepToMps(body.velocity.y, dtMs), 3));
    setAngVel(fmt(worldAngularVelocityStepToRadps(body.angularVelocity, dtMs), 3));
    setConveyorEnabled(Boolean(conveyor?.enabled));
    setConveyorSpeed(conveyor?.speed ?? 2);
    setConveyorGrip(conveyor?.grip ?? 0.28);
  }, [bodyId, body]);

  if (!body) {
    return (
      <div className="rounded-lg border border-slate-900 bg-slate-950/50 p-3 text-xs text-slate-400">
        {t("body.notFound")}
      </div>
    );
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

  const isFrame = referenceFrameBodyId === bodyId;

  return (
    <div>
      <div className={cn("rounded-xl border border-slate-800/70 bg-slate-950/40 p-3", glowClass)}>
        <div className="text-xs text-slate-500">{t("body.label")}</div>
        <input
          value={label}
          onFocus={beginPropsEdit}
          onChange={(e) => {
            const v = e.target.value;
            setLabel(v);
            meta.label = v;
          }}
          onBlur={commitPropsEdit}
          className="mt-1 h-9 w-full rounded-md border border-slate-800 bg-slate-950/50 px-2 text-sm text-slate-100 outline-none focus:border-blue-500/50"
        />
      </div>

      <Section title={t("section.referenceFrame")}>
        <div className="grid gap-3">
          <Toggle
            label={t("frame.useAsFrame")}
            checked={isFrame}
            onChange={(v) => {
              if (v) {
                setReferenceFrameBodyId(bodyId);
              } else {
                setReferenceFrameBodyId(null);
                setReferenceFrameFollow(false);
              }
            }}
          />
          <Toggle
            label={t("frame.follow")}
            checked={isFrame && referenceFrameFollow}
            disabled={!isFrame}
            onChange={(v) => setReferenceFrameFollow(v)}
          />
        </div>
      </Section>

      <Section title={t("section.triad")} icon={<Shield className="h-3.5 w-3.5" />}>
        <div className="grid grid-cols-3 gap-3">
          <LabeledNumber
            label={t("triad.mass")}
            unit="kg"
            value={triad.mass}
            onChange={(v) => onTriadChange("mass", v)}
            onFocus={beginPropsEdit}
            onBlur={commitPropsEdit}
          />
          <LabeledNumber
            label={t("triad.density")}
            unit="kg/m³"
            value={triad.density}
            onChange={(v) => onTriadChange("density", v)}
            onFocus={beginPropsEdit}
            onBlur={commitPropsEdit}
          />
          <LabeledNumber
            label={t("triad.volume")}
            unit="m³"
            value={triad.volume}
            onChange={(v) => onTriadChange("volume", v)}
            onFocus={beginPropsEdit}
            onBlur={commitPropsEdit}
          />
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          {t("triad.tip")}
        </div>
      </Section>

      <Section title={t("section.material")} icon={<RotateCw className="h-3.5 w-3.5" />}>
        <div className="grid gap-3">
          <LabeledSlider
            label={t("material.restitution")}
            value={restitution}
            min={0}
            max={1}
            step={0.01}
            unit="—"
            onPointerDown={beginPropsEdit}
            onPointerUp={commitPropsEdit}
            onChange={(v) => {
              setRestitution(v);
              body.restitution = v;
            }}
          />
          <LabeledSlider
            label={t("material.friction")}
            value={friction}
            min={0}
            max={1}
            step={0.01}
            unit="—"
            onPointerDown={beginPropsEdit}
            onPointerUp={commitPropsEdit}
            onChange={(v) => {
              setFriction(v);
              body.friction = v;
            }}
          />
          <LabeledSlider
            label={t("material.frictionStatic")}
            value={frictionStatic}
            min={0}
            max={1}
            step={0.01}
            unit="—"
            onPointerDown={beginPropsEdit}
            onPointerUp={commitPropsEdit}
            onChange={(v) => {
              setFrictionStatic(v);
              body.frictionStatic = v;
            }}
          />
        </div>
      </Section>

      <Section title={t("section.em")} icon={<Zap className="h-3.5 w-3.5" />}>
        <div className="grid gap-3">
          <Toggle
            label={t("em.isCharged")}
            checked={isCharged}
            onChange={(v) => {
              const before = captureBodyState(body);
              setIsCharged(v);
              meta.isCharged = v;
              const after = captureBodyState(body);
              commitBodyStateChange({ bodyId, before, after, apply: { transform: false, shape: false, kinematics: false } });
            }}
          />

          <LabeledNumber
            label={t("em.charge")}
            value={charge}
            onChange={(v) => {
              setCharge(v);
              const q = parseNum(v);
              meta.charge = q ?? 0;
            }}
            unit="C"
            onFocus={beginPropsEdit}
            onBlur={commitPropsEdit}
          />
          <div className="text-[11px] text-slate-500">{t("em.chargeHint")}</div>

          <label className="grid gap-1">
            <div className="text-xs text-slate-400">{t("em.distribution")}</div>
            <select
              value={distribution}
              onChange={(e) => {
                const before = captureBodyState(body);
                const v = e.target.value as ChargeDistribution;
                setDistribution(v);
                meta.chargeDistribution = v;
                const after = captureBodyState(body);
                commitBodyStateChange({ bodyId, before, after, apply: { transform: false, shape: false, kinematics: false } });
              }}
              className="h-9 w-full rounded-md border border-slate-800 bg-slate-950/50 px-2 text-sm text-slate-100 outline-none focus:border-blue-500/50"
            >
              <option value="point">{t("em.distribution.point")}</option>
              <option value="uniform">{t("em.distribution.uniform")}</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title={t("section.kinematics")}>
        <div className="grid grid-cols-3 gap-3">
          <LabeledNumber label={t("kin.velX")} unit="m/s" value={velX} onChange={setVelX} />
          <LabeledNumber label={t("kin.velY")} unit="m/s" value={velY} onChange={setVelY} />
          <LabeledNumber label={t("kin.angVel")} unit="rad/s" value={angVel} onChange={setAngVel} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const before = captureBodyState(body);
              const vx = parseNum(velX);
              const vy = parseNum(velY);
              const w = parseNum(angVel);
              if (vx !== null && vy !== null) {
                Matter.Body.setVelocity(body, { x: mpsToWorldVelocityBaseStep(vx), y: mpsToWorldVelocityBaseStep(vy) });
              }
              if (w !== null) Matter.Body.setAngularVelocity(body, radpsToWorldAngularVelocityBaseStep(w));
              commitKinematicsEdit(before);
            }}
            className="h-9 flex-1 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-200 hover:bg-slate-900/50"
          >
            {t("kin.apply")}
          </button>
          <button
            type="button"
            onClick={() => {
              const before = captureBodyState(body);
              setVelX("0");
              setVelY("0");
              setAngVel("0");
              Matter.Body.setVelocity(body, { x: 0, y: 0 });
              Matter.Body.setAngularVelocity(body, 0);
              commitKinematicsEdit(before);
            }}
            className="h-9 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-200 hover:bg-slate-900/50"
          >
            {t("kin.zero")}
          </button>
        </div>
      </Section>

      <Section title={t("section.conveyor")} icon={<MoveRight className="h-3.5 w-3.5" />}>
        <div className="grid gap-3">
          <Toggle
            label={t("conveyor.enabled")}
            checked={conveyorEnabled}
            onChange={(v) => {
              const before = captureBodyState(body);
              setConveyorEnabled(v);
              if (v) {
                if (!body.isStatic) Matter.Body.setStatic(body, true);
                const meta = ensureConveyorMeta(body, { enabled: true, speed: conveyorSpeed, grip: conveyorGrip });
                setConveyorSpeed(meta.speed);
                setConveyorGrip(meta.grip);
              } else {
                setConveyorMeta(body, null);
              }
              const after = captureBodyState(body);
              commitBodyStateChange({ bodyId, before, after, apply: { transform: false, shape: false, kinematics: false } });
            }}
          />

          <div className={cn("grid gap-3", conveyorEnabled ? "" : "opacity-40")}>
            <LabeledSlider
              label={t("conveyor.speed")}
              value={conveyorSpeed}
              min={-5}
              max={5}
              step={0.01}
              unit="m/s"
              onPointerDown={beginPropsEdit}
              onPointerUp={commitPropsEdit}
              onChange={(v) => {
                setConveyorSpeed(v);
                if (conveyorEnabled) ensureConveyorMeta(body, { speed: v });
              }}
            />
            <LabeledSlider
              label={t("conveyor.grip")}
              value={conveyorGrip}
              min={0}
              max={1}
              step={0.01}
              unit="—"
              onPointerDown={beginPropsEdit}
              onPointerUp={commitPropsEdit}
              onChange={(v) => {
                setConveyorGrip(v);
                if (conveyorEnabled) ensureConveyorMeta(body, { grip: v });
              }}
            />
            <div className="text-[11px] text-slate-500">{t("conveyor.hint")}</div>
          </div>
        </div>
      </Section>
    </div>
  );
}
