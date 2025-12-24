export const PX_PER_METER = 80;
export const BASE_DELTA_MS = 1000 / 60;

function safeDeltaMs(deltaMs: number | null | undefined) {
  return Number.isFinite(deltaMs) && (deltaMs as number) > 0 ? (deltaMs as number) : BASE_DELTA_MS;
}

export function metersToWorld(meters: number) {
  return meters * PX_PER_METER;
}

export function worldToMeters(world: number) {
  return world / PX_PER_METER;
}

// Matter.js stores `body.velocity` as a per-step displacement (not per-second).
// Convert to m/s using the step delta (ms).
export function worldVelocityStepToMps(stepVelocity: number, deltaMs: number | null | undefined) {
  const dt = safeDeltaMs(deltaMs);
  return (stepVelocity * 1000) / dt / PX_PER_METER;
}

// Body.setVelocity expects a "base-step" velocity (scaled by base delta internally).
// Convert m/s to the velocity input expected by Matter.Body.setVelocity.
export function mpsToWorldVelocityBaseStep(mps: number) {
  return (mps * PX_PER_METER * BASE_DELTA_MS) / 1000;
}

export function worldAngularVelocityStepToRadps(stepAngularVelocity: number, deltaMs: number | null | undefined) {
  const dt = safeDeltaMs(deltaMs);
  return (stepAngularVelocity * 1000) / dt;
}

export function radpsToWorldAngularVelocityBaseStep(radps: number) {
  return (radps * BASE_DELTA_MS) / 1000;
}

