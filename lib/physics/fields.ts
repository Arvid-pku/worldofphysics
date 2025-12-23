import type { FieldRegion } from "@/lib/physics/types";

export function isPointInField(field: FieldRegion, point: { x: number; y: number }) {
  if (field.shape === "rect") {
    const halfW = (field.width ?? 0) / 2;
    const halfH = (field.height ?? 0) / 2;
    return (
      point.x >= field.x - halfW &&
      point.x <= field.x + halfW &&
      point.y >= field.y - halfH &&
      point.y <= field.y + halfH
    );
  }

  const r = field.radius ?? 0;
  const dx = point.x - field.x;
  const dy = point.y - field.y;
  return dx * dx + dy * dy <= r * r;
}

export function normalizeAngleRad(rad: number) {
  const twoPi = Math.PI * 2;
  const t = rad % twoPi;
  return t < 0 ? t + twoPi : t;
}

