export const PX_PER_METER = 80;
export const BASE_DELTA_MS = 1000 / 60;

export function metersToWorld(meters: number) {
  return meters * PX_PER_METER;
}

export function worldToMeters(world: number) {
  return world / PX_PER_METER;
}

// Matter normalizes `body.velocity` and `body.angularVelocity` to "displacement
// per base step" via Body.updateVelocities (`(pos - posPrev) * baseDelta/dt`).
// That means the conversion to physical units must always use BASE_DELTA_MS,
// independent of the current frame's render delta. Using the current frame's
// dt (as earlier code did) made readings frame-rate dependent and caused the
// graphs / FBD / inspector kinematics to drift away from the real values.
//
// The optional second argument is kept for source compatibility with older call
// sites but is intentionally ignored — the velocity is already normalized.
export function worldVelocityStepToMps(stepVelocity: number, _ignoredDeltaMs?: number | null) {
  return (stepVelocity * 1000) / BASE_DELTA_MS / PX_PER_METER;
}

export function worldAngularVelocityStepToRadps(
  stepAngularVelocity: number,
  _ignoredDeltaMs?: number | null
) {
  return (stepAngularVelocity * 1000) / BASE_DELTA_MS;
}

// Body.setVelocity expects the same normalized "displacement per base step"
// units. Convert m/s -> normalized.
export function mpsToWorldVelocityBaseStep(mps: number) {
  return (mps * PX_PER_METER * BASE_DELTA_MS) / 1000;
}

export function radpsToWorldAngularVelocityBaseStep(radps: number) {
  return (radps * BASE_DELTA_MS) / 1000;
}
