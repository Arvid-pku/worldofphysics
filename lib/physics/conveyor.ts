import * as Matter from "matter-js";

import { BASE_DELTA_MS, PX_PER_METER } from "@/lib/physics/units";

export type ConveyorMeta = {
  enabled: boolean;
  speed: number; // m/s (conceptual)
  grip: number; // 0..1 (how strongly it matches belt speed)
};

const KEY = "wopConveyor";

export function getConveyorMeta(body: Matter.Body): ConveyorMeta | null {
  return (((body.plugin as any)?.[KEY] as ConveyorMeta | undefined) ?? null) as ConveyorMeta | null;
}

export function setConveyorMeta(body: Matter.Body, meta: ConveyorMeta | null) {
  if (!meta) {
    const plugin = { ...(body.plugin as any) };
    delete plugin[KEY];
    body.plugin = plugin;
    return;
  }
  body.plugin = { ...(body.plugin as any), [KEY]: meta };
}

export function ensureConveyorMeta(body: Matter.Body, patch?: Partial<ConveyorMeta>): ConveyorMeta {
  const existing = getConveyorMeta(body);
  if (existing) {
    if (patch) Object.assign(existing, patch);
    setConveyorMeta(body, existing);
    return existing;
  }
  const meta: ConveyorMeta = { enabled: true, speed: 2, grip: 0.28, ...(patch ?? {}) };
  setConveyorMeta(body, meta);
  return meta;
}

const SPEED_TO_VEL = (PX_PER_METER / 1000) * BASE_DELTA_MS;

export function applyConveyorBelts(engine: Matter.Engine) {
  const bodies = Matter.Composite.allBodies(engine.world);
  const belts = bodies.filter((b) => b.isStatic && getConveyorMeta(b)?.enabled);
  if (belts.length === 0) return;

  const dynamic = bodies.filter((b) => !b.isStatic);
  if (dynamic.length === 0) return;

  for (const belt of belts) {
    const meta = getConveyorMeta(belt);
    if (!meta || !meta.enabled) continue;
    const grip = Math.min(1, Math.max(0, meta.grip));
    if (grip <= 0) continue;

    const tangent = { x: Math.cos(belt.angle), y: Math.sin(belt.angle) };
    const normal = { x: -tangent.y, y: tangent.x };
    const targetTan = meta.speed * SPEED_TO_VEL;

    const collisions = Matter.Query.collides(belt, dynamic);
    for (const col of collisions) {
      const other = col.bodyA.id === belt.id ? col.bodyB : col.bodyA;
      if (other.isStatic) continue;

      const vx = other.velocity.x;
      const vy = other.velocity.y;
      const vTan = vx * tangent.x + vy * tangent.y;
      const vNorm = vx * normal.x + vy * normal.y;
      const nextTan = vTan + (targetTan - vTan) * grip;

      Matter.Body.setVelocity(other, {
        x: tangent.x * nextTan + normal.x * vNorm,
        y: tangent.y * nextTan + normal.y * vNorm
      });
    }
  }
}
