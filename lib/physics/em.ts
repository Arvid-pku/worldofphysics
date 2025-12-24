import * as Matter from "matter-js";

import { getBodyMeta } from "@/lib/physics/bodyMeta";
import { isPointInField } from "@/lib/physics/fields";
import type { FieldRegion } from "@/lib/physics/types";

const COULOMB_K = 0.00008;
const COULOMB_SOFTENING = 90;
const COULOMB_MAX_FORCE = 0.02;

const ELECTRIC_FORCE_SCALE = 0.00022;
const MAGNETIC_FORCE_SCALE = 0.0000012;

function clampForce(vec: Matter.Vector, max: number) {
  const mag = Math.hypot(vec.x, vec.y);
  if (mag <= max) return vec;
  const s = max / (mag || 1);
  return { x: vec.x * s, y: vec.y * s };
}

export function applyElectromagnetism(engine: Matter.Engine, fields: FieldRegion[]) {
  const bodies = Matter.Composite.allBodies(engine.world);

  const charged: Array<{ body: Matter.Body; q: number }> = [];
  for (const body of bodies) {
    const meta = getBodyMeta(body);
    if (!meta?.isCharged) continue;
    const q = meta.charge;
    if (!Number.isFinite(q) || q === 0) continue;
    charged.push({ body, q });
  }

  // Coulomb interactions
  for (let i = 0; i < charged.length; i += 1) {
    for (let j = i + 1; j < charged.length; j += 1) {
      const a = charged[i]!;
      const b = charged[j]!;
      if (a.body.isStatic && b.body.isStatic) continue;
      const dx = a.body.position.x - b.body.position.x;
      const dy = a.body.position.y - b.body.position.y;
      const dist2 = dx * dx + dy * dy + COULOMB_SOFTENING * COULOMB_SOFTENING;
      const invDist = 1 / Math.sqrt(dist2);
      const invDist2 = invDist * invDist;
      const forceMag = COULOMB_K * a.q * b.q * invDist2;
      const fx = dx * invDist * forceMag;
      const fy = dy * invDist * forceMag;
      const f = clampForce({ x: fx, y: fy }, COULOMB_MAX_FORCE);
      if (!a.body.isStatic) Matter.Body.applyForce(a.body, a.body.position, f);
      if (!b.body.isStatic) Matter.Body.applyForce(b.body, b.body.position, { x: -f.x, y: -f.y });
    }
  }

  if (fields.length === 0 || charged.length === 0) return;

  // Field regions
  for (const { body, q } of charged) {
    if (body.isStatic) continue;
    for (const field of fields) {
      if (!isPointInField(field, body.position)) continue;

      if (field.kind === "electric") {
        const dir = { x: Math.cos(field.directionRad), y: Math.sin(field.directionRad) };
        const f = {
          x: q * field.magnitude * ELECTRIC_FORCE_SCALE * dir.x,
          y: q * field.magnitude * ELECTRIC_FORCE_SCALE * dir.y
        };
        Matter.Body.applyForce(body, body.position, f);
      } else {
        const bz = field.strength;
        const v = body.velocity;
        // v x Bz => (vy * Bz, -vx * Bz)
        const f = {
          x: q * v.y * bz * MAGNETIC_FORCE_SCALE,
          y: q * -v.x * bz * MAGNETIC_FORCE_SCALE
        };
        Matter.Body.applyForce(body, body.position, f);
      }
    }
  }
}
