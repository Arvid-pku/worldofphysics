"use client";

import * as Matter from "matter-js";

import { ensureBodyMeta } from "@/lib/physics/bodyMeta";
import { setBodyShape } from "@/lib/physics/bodyShape";
import type { FieldRegion, RightPanelTab, ToolId } from "@/lib/physics/types";
import { PX_PER_METER, mpsToWorldVelocityBaseStep, metersToWorld } from "@/lib/physics/units";
import { createId } from "@/lib/utils/id";

export type LabId = "projectile" | "pendulum" | "atwood" | "charges" | "velocity";

export type LabDefinition = {
  id: LabId;
  titleKey: string;
  subtitleKey: string;
  stepsKeys: string[];
};

export type LabScene = {
  bodies: Matter.Body[];
  constraints: Matter.Constraint[];
  fields: FieldRegion[];
  camera?: { x: number; y: number; zoom: number };
  selectBodyId?: string | null;
  recommended?: {
    tool?: ToolId;
    gravity?: number;
    showTrails?: boolean;
    rightPanelTab?: RightPanelTab;
  };
};

export const LABS: LabDefinition[] = [
  {
    id: "projectile",
    titleKey: "lab.projectile.title",
    subtitleKey: "lab.projectile.subtitle",
    stepsKeys: ["lab.projectile.step1", "lab.projectile.step2", "lab.projectile.step3", "lab.projectile.step4"]
  },
  {
    id: "pendulum",
    titleKey: "lab.pendulum.title",
    subtitleKey: "lab.pendulum.subtitle",
    stepsKeys: ["lab.pendulum.step1", "lab.pendulum.step2", "lab.pendulum.step3"]
  },
  {
    id: "atwood",
    titleKey: "lab.atwood.title",
    subtitleKey: "lab.atwood.subtitle",
    stepsKeys: ["lab.atwood.step1", "lab.atwood.step2", "lab.atwood.step3"]
  },
  {
    id: "charges",
    titleKey: "lab.charges.title",
    subtitleKey: "lab.charges.subtitle",
    stepsKeys: ["lab.charges.step1", "lab.charges.step2", "lab.charges.step3"]
  },
  {
    id: "velocity",
    titleKey: "lab.velocity.title",
    subtitleKey: "lab.velocity.subtitle",
    stepsKeys: ["lab.velocity.step1", "lab.velocity.step2", "lab.velocity.step3"]
  }
];

function baseBodyOpts(): Matter.IBodyDefinition {
  return { restitution: 0.25, friction: 0.12, frictionStatic: 0.5, frictionAir: 0 };
}

function ground(y: number) {
  const body = Matter.Bodies.rectangle(0, y, metersToWorld(14), metersToWorld(0.6), { ...baseBodyOpts(), isStatic: true });
  const meta = ensureBodyMeta(body, { label: "Ground" });
  setBodyShape(body, { kind: "rectangle", width: metersToWorld(14), height: metersToWorld(0.6) });
  return { body, id: meta.id };
}

function wall(x: number, y: number, w: number, h: number, label: string) {
  const body = Matter.Bodies.rectangle(x, y, w, h, { ...baseBodyOpts(), isStatic: true });
  const meta = ensureBodyMeta(body, { label });
  setBodyShape(body, { kind: "rectangle", width: w, height: h });
  return { body, id: meta.id };
}

export function buildLabScene(labId: LabId): LabScene {
  switch (labId) {
    case "projectile": {
      const bodies: Matter.Body[] = [];
      const constraints: Matter.Constraint[] = [];
      const fields: FieldRegion[] = [];

      const g = ground(metersToWorld(3.2));
      bodies.push(g.body);

      const r = metersToWorld(0.18);
      const proj = Matter.Bodies.circle(metersToWorld(-4.2), metersToWorld(1.0), r, baseBodyOpts());
      const meta = ensureBodyMeta(proj, { label: "Projectile" });
      setBodyShape(proj, { kind: "circle", radius: r });

      // Give it an initial kick.
      Matter.Body.setVelocity(proj, { x: mpsToWorldVelocityBaseStep(9), y: mpsToWorldVelocityBaseStep(-6) });
      bodies.push(proj);

      // Target markers.
      bodies.push(wall(metersToWorld(4.5), metersToWorld(2.6), metersToWorld(0.25), metersToWorld(1.6), "Target").body);

      return {
        bodies,
        constraints,
        fields,
        camera: { x: 0, y: metersToWorld(1.2), zoom: 1 },
        selectBodyId: meta.id,
        recommended: { tool: "velocity", gravity: 9.8, showTrails: true, rightPanelTab: "graphs" }
      };
    }
    case "pendulum": {
      const bodies: Matter.Body[] = [];
      const constraints: Matter.Constraint[] = [];
      const fields: FieldRegion[] = [];

      const g = ground(metersToWorld(3.6));
      bodies.push(g.body);

      const anchor = { x: 0, y: metersToWorld(-1.8) };
      const r = metersToWorld(0.22);
      const bob = Matter.Bodies.circle(metersToWorld(2.0), metersToWorld(1.0), r, baseBodyOpts());
      const meta = ensureBodyMeta(bob, { label: "Bob" });
      setBodyShape(bob, { kind: "circle", radius: r });
      bodies.push(bob);

      const length = Math.hypot(bob.position.x - anchor.x, bob.position.y - anchor.y);
      const rope = Matter.Constraint.create({
        pointA: anchor,
        bodyB: bob,
        pointB: { x: 0, y: 0 },
        length,
        stiffness: 1,
        damping: 0
      });
      constraints.push(rope);

      // Small visual anchor.
      const pin = Matter.Bodies.circle(anchor.x, anchor.y, metersToWorld(0.08), { ...baseBodyOpts(), isStatic: true });
      ensureBodyMeta(pin, { label: "Pivot" });
      setBodyShape(pin, { kind: "circle", radius: metersToWorld(0.08) });
      bodies.push(pin);

      return {
        bodies,
        constraints,
        fields,
        camera: { x: 0, y: metersToWorld(0.8), zoom: 1 },
        selectBodyId: meta.id,
        recommended: { tool: "select", gravity: 9.8, showTrails: false, rightPanelTab: "graphs" }
      };
    }
    case "atwood": {
      const bodies: Matter.Body[] = [];
      const constraints: Matter.Constraint[] = [];
      const fields: FieldRegion[] = [];

      const g = ground(metersToWorld(3.8));
      bodies.push(g.body);

      // Two vertical guide channels (simplified Atwood).
      const shaftH = metersToWorld(5.2);
      const shaftY = metersToWorld(1.0);
      const shaftGap = metersToWorld(0.55);
      const wallW = metersToWorld(0.2);

      const leftX = metersToWorld(-2.8);
      const rightX = metersToWorld(2.8);

      bodies.push(wall(leftX - shaftGap / 2, shaftY, wallW, shaftH, "Guide L").body);
      bodies.push(wall(leftX + shaftGap / 2, shaftY, wallW, shaftH, "Guide L").body);
      bodies.push(wall(rightX - shaftGap / 2, shaftY, wallW, shaftH, "Guide R").body);
      bodies.push(wall(rightX + shaftGap / 2, shaftY, wallW, shaftH, "Guide R").body);

      const massW = metersToWorld(0.42);
      const massH = metersToWorld(0.42);
      const m1 = Matter.Bodies.rectangle(leftX, metersToWorld(0.6), massW, massH, baseBodyOpts());
      const m2 = Matter.Bodies.rectangle(rightX, metersToWorld(2.2), massW, massH, baseBodyOpts());
      const meta1 = ensureBodyMeta(m1, { label: "Mass A" });
      const meta2 = ensureBodyMeta(m2, { label: "Mass B" });
      setBodyShape(m1, { kind: "rectangle", width: massW, height: massH });
      setBodyShape(m2, { kind: "rectangle", width: massW, height: massH });

      // Make masses intentionally different.
      Matter.Body.setMass(m1, 1.2);
      Matter.Body.setMass(m2, 2.2);
      bodies.push(m1, m2);

      const ropeLen = Math.hypot(m1.position.x - m2.position.x, m1.position.y - m2.position.y);
      const rope = Matter.Constraint.create({ bodyA: m1, bodyB: m2, length: ropeLen, stiffness: 0.9, damping: 0 });
      constraints.push(rope);

      // "Pulley" marker.
      const pulley = Matter.Bodies.circle(0, metersToWorld(-1.2), metersToWorld(0.2), { ...baseBodyOpts(), isStatic: true });
      ensureBodyMeta(pulley, { label: "Pulley (visual)" });
      setBodyShape(pulley, { kind: "circle", radius: metersToWorld(0.2) });
      bodies.push(pulley);

      return {
        bodies,
        constraints,
        fields,
        camera: { x: 0, y: metersToWorld(1.4), zoom: 1 },
        selectBodyId: meta2.id ?? meta1.id,
        recommended: { tool: "select", gravity: 9.8, showTrails: false, rightPanelTab: "graphs" }
      };
    }
    case "charges": {
      const bodies: Matter.Body[] = [];
      const constraints: Matter.Constraint[] = [];
      const fields: FieldRegion[] = [];

      bodies.push(ground(metersToWorld(3.7)).body);

      // Two charges that can attract/repel.
      const r = metersToWorld(0.22);
      const a = Matter.Bodies.circle(metersToWorld(-1.6), metersToWorld(1.6), r, baseBodyOpts());
      const b = Matter.Bodies.circle(metersToWorld(1.6), metersToWorld(1.6), r, baseBodyOpts());
      const ma = ensureBodyMeta(a, { label: "Charge A", isCharged: true, charge: 1 });
      const mb = ensureBodyMeta(b, { label: "Charge B", isCharged: true, charge: -1 });
      setBodyShape(a, { kind: "circle", radius: r });
      setBodyShape(b, { kind: "circle", radius: r });
      bodies.push(a, b);

      // A gentle electric field region (optional reference).
      const field: FieldRegion = {
        id: createId("field"),
        kind: "electric",
        shape: "rect",
        label: "Electric Field",
        color: "rgba(59, 130, 246, 0.55)",
        x: 0,
        y: metersToWorld(1.2),
        width: metersToWorld(7),
        height: metersToWorld(3.5),
        magnitude: 0,
        directionRad: 0
      };
      fields.push(field);

      return {
        bodies,
        constraints,
        fields,
        camera: { x: 0, y: metersToWorld(1.5), zoom: 1 },
        selectBodyId: mb.id ?? ma.id,
        recommended: { tool: "select", gravity: 0, showTrails: true, rightPanelTab: "graphs" }
      };
    }
    case "velocity": {
      const bodies: Matter.Body[] = [];
      const constraints: Matter.Constraint[] = [];
      const fields: FieldRegion[] = [];

      bodies.push(ground(metersToWorld(3.6)).body);

      const r = metersToWorld(0.22);
      const body = Matter.Bodies.circle(0, metersToWorld(1.4), r, baseBodyOpts());
      const meta = ensureBodyMeta(body, { label: "Body" });
      setBodyShape(body, { kind: "circle", radius: r });
      bodies.push(body);

      // A fixed reference arrow (static thin wall).
      bodies.push(wall(metersToWorld(-4.5), metersToWorld(1.4), PX_PER_METER * 0.06, metersToWorld(2.0), "Marker").body);

      return {
        bodies,
        constraints,
        fields,
        camera: { x: 0, y: metersToWorld(1.4), zoom: 1 },
        selectBodyId: meta.id,
        recommended: { tool: "velocity", gravity: 9.8, showTrails: false, rightPanelTab: "graphs" }
      };
    }
    default: {
      const _exhaustive: never = labId;
      return _exhaustive;
    }
  }
}
