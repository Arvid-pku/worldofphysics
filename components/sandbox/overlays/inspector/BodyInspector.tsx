"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Matter from "matter-js";
import {
  Atom,
  Compass,
  Crosshair,
  Focus,
  Gauge,
  MoveRight,
  Scale,
  Shield,
  Tag,
  Zap
} from "lucide-react";

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

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition hover:bg-white/[0.04]",
        disabled ? "pointer-events-none opacity-40" : ""
      )}
    >
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-white">{label}</div>
        {hint ? <div className="mt-0.5 text-[10.5px] text-mute-2">{hint}</div> : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="wop-check shrink-0"
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
      <div className="surface rounded-xl p-3 text-[12px] text-mute">
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

  const chargeNum = Number(charge);
  const chargeAccent: Accent = chargeNum < 0 ? "ember" : "spark";
  const emAccent: Accent = isCharged && chargeNum !== 0 ? chargeAccent : "spark";

  const isFrame = referenceFrameBodyId === bodyId;

  return (
    <div className="grid gap-3">
      {/* Identity / Label */}
      <SectionCard title={t("body.label")} icon={<Tag className="h-3 w-3" />} accent="spark">
        <NumberInput
          value={label}
          onChange={(v) => {
            setLabel(v);
            meta.label = v;
          }}
          onFocus={beginPropsEdit}
          onBlur={commitPropsEdit}
        />
      </SectionCard>

      {/* Reference Frame */}
      <SectionCard
        title={t("section.referenceFrame")}
        icon={<Focus className="h-3 w-3" />}
        accent="violet"
      >
        <div className="grid gap-2">
          <SwitchRow
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
          <SwitchRow
            label={t("frame.follow")}
            checked={isFrame && referenceFrameFollow}
            disabled={!isFrame}
            onChange={(v) => setReferenceFrameFollow(v)}
          />
        </div>
      </SectionCard>

      {/* Mass / Density / Volume */}
      <SectionCard
        title={t("section.triad")}
        icon={<Scale className="h-3 w-3" />}
        accent="spark"
      >
        <div className="grid grid-cols-3 gap-2">
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
        <div className="mt-2.5 text-[10.5px] leading-snug text-mute-2">{t("triad.tip")}</div>
      </SectionCard>

      {/* Material */}
      <SectionCard
        title={t("section.material")}
        icon={<Shield className="h-3 w-3" />}
        accent="ok"
      >
        <div className="grid gap-3">
          <LabeledSlider
            label={t("material.restitution")}
            value={restitution}
            min={0}
            max={1}
            step={0.01}
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
            onPointerDown={beginPropsEdit}
            onPointerUp={commitPropsEdit}
            onChange={(v) => {
              setFrictionStatic(v);
              body.frictionStatic = v;
            }}
          />
        </div>
      </SectionCard>

      {/* Electromagnetism */}
      <SectionCard
        title={t("section.em")}
        icon={<Zap className="h-3 w-3" />}
        accent={emAccent}
      >
        <div className="grid gap-3">
          <SwitchRow
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

          <div className={cn("grid gap-3", isCharged ? "" : "opacity-50")}>
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
            <div className="text-[10.5px] leading-snug text-mute-2">{t("em.chargeHint")}</div>

            <label className="grid gap-1.5">
              <FieldLabel label={t("em.distribution")} />
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
                className="surface h-9 w-full rounded-lg border-transparent bg-white/[0.02] px-2.5 text-[12.5px] text-white outline-none focus:ring-1 focus:ring-spark-400/40"
              >
                <option value="point">{t("em.distribution.point")}</option>
                <option value="uniform">{t("em.distribution.uniform")}</option>
              </select>
            </label>
          </div>
        </div>
      </SectionCard>

      {/* Kinematics */}
      <SectionCard
        title={t("section.kinematics")}
        icon={<Gauge className="h-3 w-3" />}
        accent="plasma"
      >
        <div className="grid grid-cols-3 gap-2">
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
            className="btn-primary flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-semibold"
          >
            <Compass className="h-3.5 w-3.5" />
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
            className="btn-ghost flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[12.5px]"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {t("kin.zero")}
          </button>
        </div>
      </SectionCard>

      {/* Conveyor */}
      <SectionCard
        title={t("section.conveyor")}
        icon={<MoveRight className="h-3 w-3" />}
        accent="ember"
      >
        <div className="grid gap-3">
          <SwitchRow
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
              onPointerDown={beginPropsEdit}
              onPointerUp={commitPropsEdit}
              onChange={(v) => {
                setConveyorGrip(v);
                if (conveyorEnabled) ensureConveyorMeta(body, { grip: v });
              }}
            />
            <div className="text-[10.5px] leading-snug text-mute-2">{t("conveyor.hint")}</div>
          </div>
        </div>
      </SectionCard>

      {/* Decorative atom marker for charged bodies — purely visual */}
      {isCharged && chargeNum !== 0 ? (
        <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-mute-2">
          <Atom className={cn("h-3 w-3", chargeNum < 0 ? "text-ember-300" : "text-spark-200")} />
          <span className="font-mono tabular-nums">
            {chargeNum > 0 ? "+" : ""}
            {chargeNum} C
          </span>
        </div>
      ) : null}
    </div>
  );
}
