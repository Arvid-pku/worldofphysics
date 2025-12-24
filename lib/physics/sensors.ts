import * as Matter from "matter-js";

export type SensorMeta = {
  enabled: boolean;
  label: string;
  count: number;
};

const KEY = "wopSensor";

export function getSensorMeta(body: Matter.Body): SensorMeta | null {
  return (((body.plugin as any)?.[KEY] as SensorMeta | undefined) ?? null) as SensorMeta | null;
}

export function setSensorMeta(body: Matter.Body, meta: SensorMeta | null) {
  if (!meta) {
    const plugin = { ...(body.plugin as any) };
    delete plugin[KEY];
    body.plugin = plugin;
    return;
  }
  body.plugin = { ...(body.plugin as any), [KEY]: meta };
}

export function ensureSensorMeta(body: Matter.Body, patch?: Partial<SensorMeta>): SensorMeta {
  const existing = getSensorMeta(body);
  if (existing) {
    if (patch) Object.assign(existing, patch);
    setSensorMeta(body, existing);
    return existing;
  }
  const meta: SensorMeta = { enabled: true, label: "Sensor", count: 0, ...(patch ?? {}) };
  setSensorMeta(body, meta);
  return meta;
}

