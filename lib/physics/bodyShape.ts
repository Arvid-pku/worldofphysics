import * as Matter from "matter-js";

export type BodyShape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "polygon"; sides: number; radius: number };

const SHAPE_KEY = "wopShape";
const ROPE_GROUP_KEY = "wopRopeGroup";

export function getBodyShape(body: Matter.Body): BodyShape | null {
  const shape = (body.plugin as any)?.[SHAPE_KEY] as BodyShape | undefined;
  return shape ?? null;
}

export function setBodyShape(body: Matter.Body, shape: BodyShape) {
  body.plugin = { ...(body.plugin as any), [SHAPE_KEY]: shape };
}

export function inferBodyShape(body: Matter.Body): BodyShape | null {
  if (body.circleRadius) return { kind: "circle", radius: body.circleRadius };
  if (body.vertices.length === 4) {
    const v = body.vertices;
    const e0 = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
    const e1 = Math.hypot(v[1].x - v[2].x, v[1].y - v[2].y);
    const width = Math.max(e0, e1);
    const height = Math.min(e0, e1);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { kind: "rectangle", width, height };
    }
  }
  return null;
}

export function getBodyRopeGroup(body: Matter.Body): string | null {
  const id = (body.plugin as any)?.[ROPE_GROUP_KEY] as string | undefined;
  return id ?? null;
}

export function setBodyRopeGroup(body: Matter.Body, ropeGroupId: string) {
  body.plugin = { ...(body.plugin as any), [ROPE_GROUP_KEY]: ropeGroupId };
}

export function getConstraintRopeGroup(constraint: Matter.Constraint): string | null {
  const id = ((constraint as any).plugin as any)?.[ROPE_GROUP_KEY] as string | undefined;
  return id ?? null;
}

export function setConstraintRopeGroup(constraint: Matter.Constraint, ropeGroupId: string) {
  (constraint as any).plugin = { ...(((constraint as any).plugin as any) ?? {}), [ROPE_GROUP_KEY]: ropeGroupId };
}
