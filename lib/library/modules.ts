import * as Matter from "matter-js";

import type { I18nKey } from "@/lib/i18n/dict";
import { ensureBodyMeta } from "@/lib/physics/bodyMeta";
import { setBodyShape } from "@/lib/physics/bodyShape";
import { ensureSensorMeta } from "@/lib/physics/sensors";
import { metersToWorld } from "@/lib/physics/units";

type WorldPoint = { x: number; y: number };

export type SceneModuleId = "ramp_ball" | "track_ball" | "gate_sensor";

export type SceneModule = {
  id: SceneModuleId;
  titleKey: I18nKey;
  subtitleKey: I18nKey;
  create: (origin: WorldPoint) => {
    bodies: Matter.Body[];
    constraints: Matter.Constraint[];
    selectBodyId?: string | null;
  };
};

function baseBodyOpts(): Matter.IBodyDefinition {
  return { restitution: 0.25, friction: 0.12, frictionStatic: 0.5, frictionAir: 0 };
}

export const SCENE_MODULES: SceneModule[] = [
  {
    id: "ramp_ball",
    titleKey: "module.rampBall.title",
    subtitleKey: "module.rampBall.subtitle",
    create: (origin) => {
      const rampLen = metersToWorld(3.6);
      const rampThick = metersToWorld(0.22);
      const angle = (25 * Math.PI) / 180;

      const ramp = Matter.Bodies.rectangle(origin.x, origin.y, rampLen, rampThick, {
        ...baseBodyOpts(),
        isStatic: true,
        angle
      });
      ensureBodyMeta(ramp, { label: "Ramp" });
      setBodyShape(ramp, { kind: "rectangle", width: rampLen, height: rampThick });

      const ballR = metersToWorld(0.18);
      const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
      const normal = { x: -tangent.y, y: tangent.x };

      const ball = Matter.Bodies.circle(
        origin.x - tangent.x * (rampLen * 0.35) - normal.x * metersToWorld(0.55),
        origin.y - tangent.y * (rampLen * 0.35) - normal.y * metersToWorld(0.55),
        ballR,
        baseBodyOpts()
      );
      const ballMeta = ensureBodyMeta(ball, { label: "Ball" });
      setBodyShape(ball, { kind: "circle", radius: ballR });

      return { bodies: [ramp, ball], constraints: [], selectBodyId: ballMeta.id };
    }
  },
  {
    id: "track_ball",
    titleKey: "module.trackBall.title",
    subtitleKey: "module.trackBall.subtitle",
    create: (origin) => {
      const p0 = { x: origin.x - metersToWorld(2.6), y: origin.y - metersToWorld(0.4) };
      const p2 = { x: origin.x + metersToWorld(2.6), y: origin.y - metersToWorld(0.4) };
      const p1 = { x: origin.x, y: origin.y + metersToWorld(1.9) }; // bowl

      const thickness = metersToWorld(0.22);
      const segments = 18;

      const points: WorldPoint[] = [];
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const c = t * t;
        points.push({ x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y });
      }

      const bodies: Matter.Body[] = [];
      for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i]!;
        const b = points[i + 1]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 12) continue;
        const angle = Math.atan2(dy, dx);
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const seg = Matter.Bodies.rectangle(cx, cy, len, thickness, { ...baseBodyOpts(), isStatic: true, angle });
        ensureBodyMeta(seg, { label: "Track" });
        setBodyShape(seg, { kind: "rectangle", width: len, height: thickness });
        bodies.push(seg);
      }

      const ballR = metersToWorld(0.18);
      const ball = Matter.Bodies.circle(p0.x + metersToWorld(0.25), p0.y - metersToWorld(0.8), ballR, baseBodyOpts());
      const meta = ensureBodyMeta(ball, { label: "Ball" });
      setBodyShape(ball, { kind: "circle", radius: ballR });
      bodies.push(ball);

      return { bodies, constraints: [], selectBodyId: meta.id };
    }
  },
  {
    id: "gate_sensor",
    titleKey: "module.gateSensor.title",
    subtitleKey: "module.gateSensor.subtitle",
    create: (origin) => {
      const w = metersToWorld(1.4);
      const h = metersToWorld(0.25);
      const gate = Matter.Bodies.rectangle(origin.x, origin.y, w, h, {
        ...baseBodyOpts(),
        isStatic: true,
        isSensor: true
      });
      const meta = ensureBodyMeta(gate, { label: "Gate" });
      setBodyShape(gate, { kind: "rectangle", width: w, height: h });
      ensureSensorMeta(gate, { label: "Gate", count: 0 });
      return { bodies: [gate], constraints: [], selectBodyId: meta.id };
    }
  }
];

export function getSceneModuleById(id: string | null | undefined): SceneModule | null {
  if (!id) return null;
  return SCENE_MODULES.find((m) => m.id === id) ?? null;
}
