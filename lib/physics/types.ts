export type ToolId =
  | "select"
  | "pan"
  | "velocity"
  | "ruler"
  | "protractor"
  | "circle"
  | "rectangle"
  | "polygon"
  | "wall"
  | "slope"
  | "conveyor"
  | "track"
  | "rod"
  | "rope"
  | "spring"
  | "field_e_rect"
  | "field_e_circle"
  | "field_b_rect"
  | "field_b_circle";

export type FieldKind = "electric" | "magnetic";
export type FieldShape = "rect" | "circle";

export type FieldRegionBase = {
  id: string;
  kind: FieldKind;
  shape: FieldShape;
  label: string;
  color: string;
  x: number;
  y: number;
};

export type ElectricFieldRegion = FieldRegionBase & {
  kind: "electric";
  shape: FieldShape;
  width?: number;
  height?: number;
  radius?: number;
  magnitude: number;
  directionRad: number;
};

export type MagneticFieldRegion = FieldRegionBase & {
  kind: "magnetic";
  shape: FieldShape;
  width?: number;
  height?: number;
  radius?: number;
  strength: number;
};

export type FieldRegion = ElectricFieldRegion | MagneticFieldRegion;

export type ChargeDistribution = "point" | "uniform";

export type BodyMeta = {
  id: string;
  label: string;
  isCharged: boolean;
  charge: number;
  chargeDistribution: ChargeDistribution;
  volume: number;
  density: number;
};

export type SelectedEntity =
  | { kind: "body"; id: string }
  | { kind: "field"; id: string }
  | { kind: "none" };

export type HoverReadout = {
  screenX: number;
  screenY: number;
  velocity: number;
  force: number;
  kineticEnergy: number;
};

export type Vec2 = { x: number; y: number };

export type FbdAxesMode = "world" | "contact";

export type FbdReadout = {
  bodyId: string;
  net: Vec2; // ΣF
  gravity: Vec2;
  coulomb: Vec2;
  electric: Vec2;
  magnetic: Vec2;
  em: Vec2;
  contact: Vec2; // residual after subtracting gravity + EM
  normal: Vec2;
  friction: Vec2;
  normalAxis: Vec2 | null; // unit vector
  tangentAxis: Vec2 | null; // unit vector
};
