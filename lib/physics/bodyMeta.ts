import * as Matter from "matter-js";

import type { BodyMeta } from "@/lib/physics/types";
import { createId } from "@/lib/utils/id";

const META_KEY = "wop";

export function getBodyMeta(body: Matter.Body): BodyMeta | null {
  const meta = (body.plugin as any)?.[META_KEY] as BodyMeta | undefined;
  return meta ?? null;
}

export function ensureBodyMeta(body: Matter.Body, patch?: Partial<BodyMeta>): BodyMeta {
  const existing = getBodyMeta(body);
  if (existing) {
    if (patch) Object.assign(existing, patch);
    return existing;
  }

  const id = createId("body");
  const volume = Math.max(1, body.area);
  const meta: BodyMeta = {
    id,
    label: patch?.label ?? body.label ?? "Body",
    isCharged: false,
    charge: 0,
    chargeDistribution: "point",
    volume,
    density: body.mass / volume
  };

  body.plugin = { ...(body.plugin as any), [META_KEY]: meta };
  return meta;
}

export function findBodyByMetaId(engine: Matter.Engine, id: string): Matter.Body | null {
  const bodies = Matter.Composite.allBodies(engine.world);
  for (const body of bodies) {
    const meta = getBodyMeta(body);
    if (meta?.id === id) return body;
  }
  return null;
}

