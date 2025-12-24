import * as Matter from "matter-js";

import { ensureBodyMeta, getBodyMeta } from "@/lib/physics/bodyMeta";
import { getBodyShape, inferBodyShape, setBodyShape, type BodyShape } from "@/lib/physics/bodyShape";
import { getConveyorMeta, setConveyorMeta, type ConveyorMeta } from "@/lib/physics/conveyor";
import type { BodyMeta } from "@/lib/physics/types";

export type BodySnapshot = {
  shape: BodyShape;
  position: { x: number; y: number };
  angle: number;
  isStatic: boolean;
  restitution: number;
  friction: number;
  frictionStatic: number;
  mass: number;
  velocity: { x: number; y: number };
  angularVelocity: number;
  meta: Omit<BodyMeta, "id">;
  extras?: {
    conveyor?: ConveyorMeta;
  };
};

export function snapshotBody(body: Matter.Body): BodySnapshot | null {
  const shape = getBodyShape(body) ?? inferBodyShape(body);
  if (!shape) return null;

  const meta = getBodyMeta(body);
  const fallback: Omit<BodyMeta, "id"> = {
    label: body.label || "Body",
    isCharged: false,
    charge: 0,
    chargeDistribution: "point",
    volume: Math.max(1, body.area),
    density: body.mass / Math.max(1, body.area)
  };

  const m = meta ?? fallback;

  const conveyor = getConveyorMeta(body);

  const snapshot: BodySnapshot = {
    shape,
    position: { x: body.position.x, y: body.position.y },
    angle: body.angle,
    isStatic: body.isStatic,
    restitution: body.restitution,
    friction: body.friction,
    frictionStatic: body.frictionStatic,
    mass: body.mass,
    velocity: { x: body.velocity.x, y: body.velocity.y },
    angularVelocity: body.angularVelocity,
    meta: {
      label: m.label,
      isCharged: m.isCharged,
      charge: m.charge,
      chargeDistribution: m.chargeDistribution,
      volume: m.volume,
      density: m.density
    }
  };

  if (conveyor) {
    snapshot.extras = { ...(snapshot.extras ?? {}), conveyor: { ...conveyor } };
  }

  return snapshot;
}

export function createBodyFromSnapshot(
  snapshot: BodySnapshot,
  opts?: { position?: { x: number; y: number }; offset?: { x: number; y: number } }
) {
  const offset = opts?.offset ?? { x: 0, y: 0 };
  const position = opts?.position ?? {
    x: snapshot.position.x + offset.x,
    y: snapshot.position.y + offset.y
  };

  const common: Matter.IBodyDefinition = {
    isStatic: snapshot.isStatic,
    restitution: snapshot.restitution,
    friction: snapshot.friction,
    frictionStatic: snapshot.frictionStatic,
    angle: snapshot.angle
  };

  let body: Matter.Body;
  if (snapshot.shape.kind === "circle") {
    body = Matter.Bodies.circle(position.x, position.y, snapshot.shape.radius, common);
  } else if (snapshot.shape.kind === "rectangle") {
    body = Matter.Bodies.rectangle(position.x, position.y, snapshot.shape.width, snapshot.shape.height, common);
  } else {
    body = Matter.Bodies.polygon(position.x, position.y, snapshot.shape.sides, snapshot.shape.radius, common);
  }

  body.label = snapshot.meta.label;
  setBodyShape(body, snapshot.shape);

  const meta = ensureBodyMeta(body, { label: snapshot.meta.label });
  meta.isCharged = snapshot.meta.isCharged;
  meta.charge = snapshot.meta.charge;
  meta.chargeDistribution = snapshot.meta.chargeDistribution;
  meta.volume = snapshot.meta.volume;
  meta.density = snapshot.meta.density;

  if (!body.isStatic && Number.isFinite(snapshot.mass) && snapshot.mass > 0) {
    Matter.Body.setMass(body, snapshot.mass);
  }

  Matter.Body.setVelocity(body, snapshot.velocity);
  Matter.Body.setAngularVelocity(body, snapshot.angularVelocity);

  if (snapshot.extras?.conveyor) {
    setConveyorMeta(body, { ...snapshot.extras.conveyor });
  }

  return body;
}
