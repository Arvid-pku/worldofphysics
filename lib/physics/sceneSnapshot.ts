"use client";

import * as Matter from "matter-js";

import type { FieldRegion } from "@/lib/physics/types";
import { snapshotBody, createBodyFromSnapshot, type BodySnapshot } from "@/lib/physics/snapshot";

export type SceneSnapshot = {
  v: 1;
  bodies: BodySnapshot[];
  fields: FieldRegion[];
  // We intentionally do not serialize constraints in v1 — re-creating constraint
  // attachments by-id is non-trivial. Most lab/quick scenes are body+field based.
};

export function captureScene(engine: Matter.Engine | null, fields: FieldRegion[]): SceneSnapshot {
  const bodies: BodySnapshot[] = [];
  if (engine) {
    for (const b of Matter.Composite.allBodies(engine.world)) {
      const snap = snapshotBody(b);
      if (snap) bodies.push(snap);
    }
  }
  return { v: 1, bodies, fields: fields.map((f) => ({ ...f })) };
}

export function applyScene(
  scene: SceneSnapshot,
  ctx: {
    engine: Matter.Engine | null;
    setFields: (fields: FieldRegion[]) => void;
  }
) {
  const engine = ctx.engine;
  if (!engine) return;

  // Clear current world
  Matter.World.clear(engine.world, false, true);

  // Re-add bodies
  const newBodies = scene.bodies.map((s) =>
    createBodyFromSnapshot(s, { position: s.position })
  );
  if (newBodies.length) Matter.World.add(engine.world, newBodies);

  ctx.setFields(scene.fields ?? []);
}
