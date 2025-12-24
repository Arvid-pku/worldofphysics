import * as Matter from "matter-js";

import { ensureBodyMeta } from "@/lib/physics/bodyMeta";
import { getBodyShape, inferBodyShape, setBodyShape, type BodyShape } from "@/lib/physics/bodyShape";
import { getConveyorMeta, setConveyorMeta, type ConveyorMeta } from "@/lib/physics/conveyor";
import type { BodyMeta } from "@/lib/physics/types";

export type BodyState = {
  position: { x: number; y: number };
  angle: number;
  isStatic: boolean;
  restitution: number;
  friction: number;
  frictionStatic: number;
  frictionAir: number;
  mass: number;
  velocity: { x: number; y: number };
  angularVelocity: number;
  meta: Omit<BodyMeta, "id">;
  shape: BodyShape | null;
  conveyor: ConveyorMeta | null;
};

function safeShape(body: Matter.Body): BodyShape | null {
  return getBodyShape(body) ?? inferBodyShape(body);
}

export function captureBodyState(body: Matter.Body): BodyState {
  const meta = ensureBodyMeta(body);
  const shape = safeShape(body);
  const conveyor = getConveyorMeta(body);
  return {
    position: { x: body.position.x, y: body.position.y },
    angle: body.angle,
    isStatic: body.isStatic,
    restitution: body.restitution,
    friction: body.friction,
    frictionStatic: body.frictionStatic,
    frictionAir: (body as any).frictionAir ?? 0,
    mass: body.mass,
    velocity: { x: body.velocity.x, y: body.velocity.y },
    angularVelocity: body.angularVelocity,
    meta: {
      label: meta.label,
      isCharged: meta.isCharged,
      charge: meta.charge,
      chargeDistribution: meta.chargeDistribution,
      volume: meta.volume,
      density: meta.density
    },
    shape: shape ? { ...shape } : null,
    conveyor: conveyor ? { ...conveyor } : null
  };
}

function applyShape(body: Matter.Body, target: BodyShape | null) {
  if (!target) return;
  const current = safeShape(body);
  if (!current) {
    setBodyShape(body, target);
    return;
  }
  if (current.kind !== target.kind) {
    setBodyShape(body, target);
    return;
  }

  if (target.kind === "circle") {
    const curR = (current as Extract<BodyShape, { kind: "circle" }>).radius;
    const nextR = target.radius;
    if (Number.isFinite(curR) && Number.isFinite(nextR) && curR > 0 && nextR > 0) {
      const s = nextR / curR;
      Matter.Body.scale(body, s, s);
    }
  } else if (target.kind === "rectangle") {
    const cur = current as Extract<BodyShape, { kind: "rectangle" }>;
    const next = target as Extract<BodyShape, { kind: "rectangle" }>;
    if (cur.width > 0 && cur.height > 0 && next.width > 0 && next.height > 0) {
      Matter.Body.scale(body, next.width / cur.width, next.height / cur.height);
    }
  } else {
    const curR = (current as Extract<BodyShape, { kind: "polygon" }>).radius;
    const nextR = target.radius;
    if (Number.isFinite(curR) && Number.isFinite(nextR) && curR > 0 && nextR > 0) {
      const s = nextR / curR;
      Matter.Body.scale(body, s, s);
    }
  }

  setBodyShape(body, target);
}

export type ApplyBodyStateOptions = {
  transform?: boolean; // position + angle
  shape?: boolean; // geometry scaling
  kinematics?: boolean; // velocity + angular velocity
};

export function applyBodyState(body: Matter.Body, state: BodyState, opts?: ApplyBodyStateOptions) {
  const transform = opts?.transform ?? true;
  const shape = opts?.shape ?? true;
  const kinematics = opts?.kinematics ?? true;

  if (body.isStatic !== state.isStatic) Matter.Body.setStatic(body, state.isStatic);

  if (transform) {
    Matter.Body.setPosition(body, state.position);
    Matter.Body.setAngle(body, state.angle);
  }

  if (shape) applyShape(body, state.shape);

  body.restitution = state.restitution;
  body.friction = state.friction;
  body.frictionStatic = state.frictionStatic;
  (body as any).frictionAir = state.frictionAir;

  if (!body.isStatic && Number.isFinite(state.mass) && state.mass > 0) {
    Matter.Body.setMass(body, state.mass);
  }

  if (kinematics) {
    Matter.Body.setVelocity(body, state.velocity);
    Matter.Body.setAngularVelocity(body, state.angularVelocity);
  }

  const meta = ensureBodyMeta(body);
  meta.label = state.meta.label;
  meta.isCharged = state.meta.isCharged;
  meta.charge = state.meta.charge;
  meta.chargeDistribution = state.meta.chargeDistribution;
  meta.volume = state.meta.volume;
  meta.density = state.meta.density;

  setConveyorMeta(body, state.conveyor ? { ...state.conveyor } : null);
}
