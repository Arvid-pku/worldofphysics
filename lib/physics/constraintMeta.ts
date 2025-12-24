import * as Matter from "matter-js";

import type { ConstraintKind, ConstraintMeta } from "@/lib/physics/types";
import { createId } from "@/lib/utils/id";

const META_KEY = "wopConstraint";

export function getConstraintMeta(constraint: Matter.Constraint): ConstraintMeta | null {
  const meta = (((constraint as any).plugin as any)?.[META_KEY] as ConstraintMeta | undefined) ?? undefined;
  return meta ?? null;
}

export function ensureConstraintMeta(constraint: Matter.Constraint, patch?: Partial<ConstraintMeta> & { kind?: ConstraintKind }): ConstraintMeta {
  const existing = getConstraintMeta(constraint);
  if (existing) {
    if (patch) Object.assign(existing, patch);
    (constraint as any).plugin = { ...(((constraint as any).plugin as any) ?? {}), [META_KEY]: existing };
    return existing;
  }

  const id = createId("constraint");
  const stiffness = patch?.stiffness ?? constraint.stiffness ?? 0.9;
  const damping = patch?.damping ?? constraint.damping ?? 0;
  const restLength = patch?.restLength ?? constraint.length ?? 0;
  const kind = patch?.kind ?? ("rod" satisfies ConstraintKind);

  const meta: ConstraintMeta = {
    id,
    kind,
    label: patch?.label ?? constraint.label ?? "Constraint",
    restLength,
    stiffness,
    damping
  };

  (constraint as any).plugin = { ...(((constraint as any).plugin as any) ?? {}), [META_KEY]: meta };
  return meta;
}

export function findConstraintByMetaId(engine: Matter.Engine, id: string): Matter.Constraint | null {
  const constraints = Matter.Composite.allConstraints(engine.world);
  for (const c of constraints) {
    const meta = getConstraintMeta(c);
    if (meta?.id === id) return c;
  }
  return null;
}

