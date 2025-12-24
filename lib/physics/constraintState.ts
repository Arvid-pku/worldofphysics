import * as Matter from "matter-js";

import { ensureBodyMeta, findBodyByMetaId } from "@/lib/physics/bodyMeta";
import { ensureConstraintMeta } from "@/lib/physics/constraintMeta";
import type { ConstraintKind, ConstraintMeta } from "@/lib/physics/types";

export type ConstraintState = {
  id: string;
  meta: ConstraintMeta;
  bodyAId: string | null;
  bodyBId: string | null;
  pointA: { x: number; y: number };
  pointB: { x: number; y: number };
  angleA: number;
  angleB: number;
};

export function captureConstraintState(constraint: Matter.Constraint): ConstraintState | null {
  const meta = ensureConstraintMeta(constraint);
  const bodyAId = constraint.bodyA ? ensureBodyMeta(constraint.bodyA).id : null;
  const bodyBId = constraint.bodyB ? ensureBodyMeta(constraint.bodyB).id : null;
  const pointA = constraint.pointA ? { x: constraint.pointA.x, y: constraint.pointA.y } : { x: 0, y: 0 };
  const pointB = constraint.pointB ? { x: constraint.pointB.x, y: constraint.pointB.y } : { x: 0, y: 0 };
  const angleA = Number((constraint as any).angleA ?? 0);
  const angleB = Number((constraint as any).angleB ?? 0);
  return { id: meta.id, meta: { ...meta }, bodyAId, bodyBId, pointA, pointB, angleA, angleB };
}

export function applyConstraintState(engine: Matter.Engine, constraint: Matter.Constraint, state: ConstraintState) {
  const meta = ensureConstraintMeta(constraint, { ...state.meta, kind: state.meta.kind as ConstraintKind });
  Object.assign(meta, state.meta);

  const bodyA = state.bodyAId ? findBodyByMetaId(engine, state.bodyAId) : null;
  const bodyB = state.bodyBId ? findBodyByMetaId(engine, state.bodyBId) : null;

  (constraint as any).bodyA = bodyA;
  (constraint as any).bodyB = bodyB;
  constraint.pointA = { ...state.pointA };
  constraint.pointB = { ...state.pointB };

  (constraint as any).angleA = Number.isFinite(state.angleA) ? state.angleA : bodyA?.angle ?? 0;
  (constraint as any).angleB = Number.isFinite(state.angleB) ? state.angleB : bodyB?.angle ?? 0;

  const axisSpring = meta.kind === "spring" && meta.mode === "axis";
  constraint.stiffness = axisSpring ? 0 : meta.stiffness;
  constraint.damping = axisSpring ? 0 : meta.damping;
  constraint.length = meta.restLength;
}
