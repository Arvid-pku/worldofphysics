export type ToolId =
  | "select"
  | "pan"
  | "circle"
  | "rectangle"
  | "polygon"
  | "wall"
  | "slope"
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
  kineticEnergy: number;
};

