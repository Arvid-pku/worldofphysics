"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as Matter from "matter-js";

import { useSandbox } from "@/components/sandbox/SandboxContext";
import { ensureBodyMeta, findBodyByMetaId, getBodyMeta } from "@/lib/physics/bodyMeta";
import { getBodyShape, inferBodyShape, setBodyRopeGroup, setBodyShape, setConstraintRopeGroup, type BodyShape } from "@/lib/physics/bodyShape";
import { applyConveyorBelts, ensureConveyorMeta, getConveyorMeta } from "@/lib/physics/conveyor";
import { applyElectromagnetism } from "@/lib/physics/em";
import { isPointInField } from "@/lib/physics/fields";
import type { FieldRegion, ToolId } from "@/lib/physics/types";
import { BASE_DELTA_MS, metersToWorld, worldToMeters, worldVelocityStepToMps } from "@/lib/physics/units";
import { cn } from "@/lib/utils/cn";
import { createId } from "@/lib/utils/id";

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

type CollisionMark = {
  x: number;
  y: number;
  t: number;
};

type WorldPoint = { x: number; y: number };

type Measurement =
  | { kind: "ruler"; a: WorldPoint; b: WorldPoint }
  | { kind: "protractor"; vertex: WorldPoint; a: WorldPoint; b: WorldPoint | null };

type Interaction =
  | { kind: "none" }
  | { kind: "pan"; pointerId: number; startX: number; startY: number; startCameraX: number; startCameraY: number }
  | { kind: "draw"; pointerId: number; tool: ToolId; startWorld: WorldPoint; currentWorld: WorldPoint }
  | { kind: "measure_ruler"; pointerId: number; startWorld: WorldPoint; currentWorld: WorldPoint }
  | {
      kind: "measure_protractor";
      pointerId: number;
      phase: 1 | 2;
      vertexWorld: WorldPoint;
      ray1World: WorldPoint;
      currentWorld: WorldPoint;
    }
  | {
      kind: "select_press";
      pointerId: number;
      startScreen: { x: number; y: number };
      startWorld: WorldPoint;
      shiftKey: boolean;
      hit:
        | { kind: "body"; body: Matter.Body; bodyMetaId: string }
        | { kind: "field"; fieldId: string }
        | { kind: "empty" };
    }
  | {
      kind: "box_select";
      pointerId: number;
      startWorld: WorldPoint;
      currentWorld: WorldPoint;
      additive: boolean;
      baseSelection: string[];
    }
  | {
      kind: "move_selection";
      pointerId: number;
      startWorld: WorldPoint;
      primaryId: string;
      bodyIds: string[];
      starts: Array<{ id: string; x: number; y: number }>;
    }
  | {
      kind: "rotate_body";
      pointerId: number;
      bodyId: string;
      center: WorldPoint;
      angleOffset: number;
    }
  | {
      kind: "resize_body";
      pointerId: number;
      bodyId: string;
      center: WorldPoint;
      startDist: number;
      lastScale: number;
      initialShape: BodyShape | null;
    }
  | {
      kind: "move_field";
      pointerId: number;
      fieldId: string;
      startWorld: WorldPoint;
      startField: FieldRegion;
    }
  | {
      kind: "resize_field";
      pointerId: number;
      fieldId: string;
      handle: "corner" | "radius";
      startWorld: WorldPoint;
      startField: FieldRegion;
    }
  | {
      kind: "drag_constraint_anchor";
      pointerId: number;
      constraint: Matter.Constraint;
      which: "pointA" | "pointB";
    }
  | {
      kind: "constraint";
      pointerId: number;
      tool: Extract<ToolId, "rod" | "spring" | "rope">;
      startBody: Matter.Body;
      startBodyMetaId: string;
    };

export function SimulationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    engineRef,
    stepRequestedRef,
    resetNonce,
    isRunning,
    timeScale,
    gravity,
    tool,
    setTool,
    showCollisionPoints,
    showVelocityVectors,
    showTrails,
    snapEnabled,
    snapStepMeters,
    fields,
    setFields,
    selected,
    selectedBodyIds,
    hoveredBodyId,
    pointerWorldRef,
    commitWorldAdd,
    commitFieldAdd,
    commitFieldChange,
    selectBody,
    setSelectedBodies,
    selectField,
    clearSelection,
    setHoveredBodyId,
    setHoverReadout
  } = useSandbox();

  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const collisionsRef = useRef<CollisionMark[]>([]);
  const forceByBodyIdRef = useRef<Map<string, number>>(new Map());
  const trailsRef = useRef<Map<string, WorldPoint[]>>(new Map());
  const measurementRef = useRef<Measurement | null>(null);
  const interactionRef = useRef<Interaction>({ kind: "none" });
  const lastPointerWorldRef = useRef<WorldPoint | null>(null);
  const fieldsRef = useRef<FieldRegion[]>(fields);
  const selectedRef = useRef(selected);
  const selectedBodyIdsRef = useRef(selectedBodyIds);
  const hoveredBodyIdRef = useRef<string | null>(hoveredBodyId);
  const lastPointerScreenRef = useRef<{ x: number; y: number } | null>(null);
  const lastHoverUpdateRef = useRef(0);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    selectedBodyIdsRef.current = selectedBodyIds;
  }, [selectedBodyIds]);

  useEffect(() => {
    hoveredBodyIdRef.current = hoveredBodyId;
  }, [hoveredBodyId]);

  useEffect(() => {
    if (!showTrails) trailsRef.current.clear();
  }, [showTrails]);

  useEffect(() => {
    if (tool !== "ruler" && tool !== "protractor") measurementRef.current = null;
  }, [tool]);

  const screenToWorld = useMemo(() => {
    return (screenX: number, screenY: number, rect: DOMRect) => {
      const camera = cameraRef.current;
      const x = (screenX - rect.width / 2) / camera.zoom + camera.x;
      const y = (screenY - rect.height / 2) / camera.zoom + camera.y;
      return { x, y };
    };
  }, []);

  const snapWorld = useMemo(() => {
    if (!snapEnabled) return (p: WorldPoint) => p;
    const step = metersToWorld(snapStepMeters);
    if (!Number.isFinite(step) || step <= 0) return (p: WorldPoint) => p;
    return (p: WorldPoint) => ({ x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step });
  }, [snapEnabled, snapStepMeters]);

  const settingsRef = useRef({
    isRunning,
    timeScale,
    gravity,
    tool,
    showCollisionPoints,
    showVelocityVectors,
    showTrails,
    snapEnabled,
    snapStepMeters
  });

  useEffect(() => {
    settingsRef.current = {
      isRunning,
      timeScale,
      gravity,
      tool,
      showCollisionPoints,
      showVelocityVectors,
      showTrails,
      snapEnabled,
      snapStepMeters
    };
  }, [gravity, isRunning, showCollisionPoints, showTrails, showVelocityVectors, snapEnabled, snapStepMeters, timeScale, tool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = Matter.Engine.create();
    engine.gravity.scale = 0.001;
    engineRef.current = engine;

    collisionsRef.current = [];
    cameraRef.current = { x: 0, y: 0, zoom: 1 };
    interactionRef.current = { kind: "none" };
    lastPointerWorldRef.current = null;
    const onCollisionStart = (evt: Matter.IEventCollision<Matter.Engine>) => {
      const now = performance.now();
      for (const pair of evt.pairs) {
        for (const s of pair.collision.supports as Array<{ x: number; y: number } | null | undefined>) {
          if (!s) continue;
          if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
          collisionsRef.current.push({ x: s.x, y: s.y, t: now });
        }
      }
    };
    Matter.Events.on(engine, "collisionStart", onCollisionStart);

    let raf = 0;
    let last = performance.now();
    const draw = () => {
      const now = performance.now();
      const rawDt = now - last;
      last = now;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      // Physics step
      const settings = settingsRef.current;
      engine.gravity.y = settings.gravity / 9.8;
      const dt = Math.min(50, Math.max(0, rawDt));
      const shouldStep = settings.isRunning || stepRequestedRef.current;
      if (shouldStep) {
        const stepDt = settings.isRunning
          ? dt * settings.timeScale
          : (1000 / 60) * Math.max(settings.timeScale, 0.0001);
        const preVelById = new Map<number, { vx: number; vy: number; dtMs: number; metaId: string | null }>();
        const bodiesBefore = Matter.Composite.allBodies(engine.world);
        for (const b of bodiesBefore) {
          const metaId = getBodyMeta(b)?.id ?? null;
          preVelById.set(b.id, {
            vx: b.velocity.x,
            vy: b.velocity.y,
            dtMs: (b as any).deltaTime || BASE_DELTA_MS,
            metaId
          });
        }
        applyElectromagnetism(engine, fieldsRef.current);
        applyConveyorBelts(engine);
        Matter.Engine.update(engine, stepDt);
        if (Number.isFinite(stepDt) && stepDt > 0) {
          const forceById = forceByBodyIdRef.current;
          const bodiesAfter = Matter.Composite.allBodies(engine.world);
          const seen = new Set<string>();
          for (const b of bodiesAfter) {
            if (b.isStatic) continue;
            if (!Number.isFinite(b.mass) || b.mass <= 0) continue;
            const pre = preVelById.get(b.id) ?? null;
            const metaId = pre?.metaId ?? getBodyMeta(b)?.id ?? null;
            if (!metaId) continue;
            const prevDt = pre?.dtMs ?? BASE_DELTA_MS;
            const currDt = (b as any).deltaTime || stepDt || BASE_DELTA_MS;
            const dtSeconds = currDt / 1000;
            if (!Number.isFinite(dtSeconds) || dtSeconds <= 1e-6) continue;
            const prevVx = pre?.vx ?? b.velocity.x;
            const prevVy = pre?.vy ?? b.velocity.y;
            const prevVxMps = worldVelocityStepToMps(prevVx, prevDt);
            const prevVyMps = worldVelocityStepToMps(prevVy, prevDt);
            const currVxMps = worldVelocityStepToMps(b.velocity.x, currDt);
            const currVyMps = worldVelocityStepToMps(b.velocity.y, currDt);
            const ax = (currVxMps - prevVxMps) / dtSeconds;
            const ay = (currVyMps - prevVyMps) / dtSeconds;
            const f = b.mass * Math.hypot(ax, ay);
            if (Number.isFinite(f)) forceById.set(metaId, f);
            seen.add(metaId);
          }
          for (const key of Array.from(forceById.keys())) {
            if (!seen.has(key)) forceById.delete(key);
          }
        }

        if (settings.showTrails) {
          const trails = trailsRef.current;
          const bodiesNow = Matter.Composite.allBodies(engine.world);
          const seen = new Set<string>();
          for (const b of bodiesNow) {
            if (b.isStatic) continue;
            const metaId = getBodyMeta(b)?.id ?? null;
            if (!metaId) continue;
            seen.add(metaId);
            const arr = trails.get(metaId) ?? [];
            const last = arr[arr.length - 1] ?? null;
            const dx = last ? b.position.x - last.x : 999;
            const dy = last ? b.position.y - last.y : 999;
            if (!last || dx * dx + dy * dy > 18 * 18) {
              arr.push({ x: b.position.x, y: b.position.y });
              if (arr.length > 240) arr.splice(0, arr.length - 240);
              trails.set(metaId, arr);
            } else if (!trails.has(metaId)) {
              trails.set(metaId, arr);
            }
          }
          for (const key of Array.from(trails.keys())) {
            if (!seen.has(key)) trails.delete(key);
          }
        }
        stepRequestedRef.current = false;
      }

      // Hover readout (realtime)
      if (interactionRef.current.kind === "none") {
        const hoveredId = hoveredBodyIdRef.current;
        const pointerScreen = lastPointerScreenRef.current;
        if (hoveredId && pointerScreen) {
          if (now - lastHoverUpdateRef.current > 50) {
            const body = findBodyByMetaId(engine, hoveredId);
            if (!body) {
              hoveredBodyIdRef.current = null;
              setHoveredBodyId(null);
              setHoverReadout(null);
            } else {
              const dtMs = (body as any).deltaTime || engine.timing.lastDelta || BASE_DELTA_MS;
              const v = worldVelocityStepToMps(Math.hypot(body.velocity.x, body.velocity.y), dtMs);
              const ke = 0.5 * body.mass * v * v;
              const f = forceByBodyIdRef.current.get(hoveredId) ?? 0;
              setHoverReadout({
                screenX: pointerScreen.x,
                screenY: pointerScreen.y,
                velocity: v,
                force: f,
                kineticEnergy: ke
              });
            }
            lastHoverUpdateRef.current = now;
          }
        }
      }

      // Render
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "rgba(2, 6, 23, 1)";
      ctx.fillRect(0, 0, width, height);

      const camera = cameraRef.current;
      const left = camera.x - width / (2 * camera.zoom);
      const right = camera.x + width / (2 * camera.zoom);
      const top = camera.y - height / (2 * camera.zoom);
      const bottom = camera.y + height / (2 * camera.zoom);

      // Grid (world-space)
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-camera.x, -camera.y);

      const grid = 80;
      const x0 = Math.floor(left / grid) * grid;
      const y0 = Math.floor(top / grid) * grid;
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      ctx.lineWidth = 1 / camera.zoom;
      for (let x = x0; x <= right; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
      }
      for (let y = y0; y <= bottom; y += grid) {
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
      }

      // Field regions
      const selectedEntity = selectedRef.current;
      const selectedFieldId = selectedEntity.kind === "field" ? selectedEntity.id : null;
      const selectedBodyId = selectedEntity.kind === "body" ? selectedEntity.id : null;
      const selectedBodyList = selectedBodyIdsRef.current;
      const selectedBodyIdSet = new Set(
        selectedBodyList.length > 0 ? selectedBodyList : selectedBodyId ? [selectedBodyId] : []
      );
      const hoveredId = hoveredBodyIdRef.current;
      let selectedField: FieldRegion | null = null;
      for (const field of fieldsRef.current) {
        const isSelected = selectedFieldId === field.id;
        if (isSelected) selectedField = field;
        const color =
          field.kind === "electric" ? "rgba(59, 130, 246, 0.55)" : "rgba(34, 197, 94, 0.55)";

        ctx.lineWidth = (isSelected ? 2.2 : 1.2) / camera.zoom;
        ctx.strokeStyle = color;
        ctx.fillStyle =
          field.kind === "electric" ? "rgba(59, 130, 246, 0.06)" : "rgba(34, 197, 94, 0.05)";

        ctx.beginPath();
        if (field.shape === "rect") {
          const w = field.width ?? 0;
          const h = field.height ?? 0;
          ctx.rect(field.x - w / 2, field.y - h / 2, w, h);
        } else {
          const r = field.radius ?? 0;
          ctx.arc(field.x, field.y, r, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();

        // Visualize direction/strength
        if (field.kind === "electric") {
          const dirSign = field.magnitude >= 0 ? 1 : -1;
          const dir = {
            x: Math.cos(field.directionRad) * dirSign,
            y: Math.sin(field.directionRad) * dirSign
          };
          const mag = Math.min(2.5, Math.abs(field.magnitude));
          const arrowLen = (18 + 10 * mag) / camera.zoom;
          const spacing = 90;
          const bounds =
            field.shape === "rect"
              ? { left: field.x - (field.width ?? 0) / 2, right: field.x + (field.width ?? 0) / 2, top: field.y - (field.height ?? 0) / 2, bottom: field.y + (field.height ?? 0) / 2 }
              : { left: field.x - (field.radius ?? 0), right: field.x + (field.radius ?? 0), top: field.y - (field.radius ?? 0), bottom: field.y + (field.radius ?? 0) };

          ctx.strokeStyle = "rgba(147, 197, 253, 0.35)";
          ctx.lineWidth = 1 / camera.zoom;
          for (let x = Math.floor(bounds.left / spacing) * spacing; x <= bounds.right; x += spacing) {
            for (let y = Math.floor(bounds.top / spacing) * spacing; y <= bounds.bottom; y += spacing) {
              if (!isPointInField(field, { x, y })) continue;
              drawArrow(ctx, x, y, dir.x, dir.y, arrowLen, 5 / camera.zoom);
            }
          }
        } else {
          const bz = field.strength;
          const mag = Math.min(2.5, Math.abs(bz));
          const spacing = 90;
          const dot = (2.2 + mag) / camera.zoom;
          const bounds =
            field.shape === "rect"
              ? { left: field.x - (field.width ?? 0) / 2, right: field.x + (field.width ?? 0) / 2, top: field.y - (field.height ?? 0) / 2, bottom: field.y + (field.height ?? 0) / 2 }
              : { left: field.x - (field.radius ?? 0), right: field.x + (field.radius ?? 0), top: field.y - (field.radius ?? 0), bottom: field.y + (field.radius ?? 0) };

          ctx.strokeStyle = "rgba(134, 239, 172, 0.45)";
          ctx.fillStyle = "rgba(134, 239, 172, 0.45)";
          ctx.lineWidth = 1 / camera.zoom;
          for (let x = Math.floor(bounds.left / spacing) * spacing; x <= bounds.right; x += spacing) {
            for (let y = Math.floor(bounds.top / spacing) * spacing; y <= bounds.bottom; y += spacing) {
              if (!isPointInField(field, { x, y })) continue;
              if (bz >= 0) {
                ctx.beginPath();
                ctx.arc(x, y, dot, 0, Math.PI * 2);
                ctx.fill();
              } else {
                ctx.beginPath();
                ctx.moveTo(x - dot, y - dot);
                ctx.lineTo(x + dot, y + dot);
                ctx.moveTo(x + dot, y - dot);
                ctx.lineTo(x - dot, y + dot);
                ctx.stroke();
              }
            }
          }
        }
      }

      // Bodies
      const bodies = Matter.Composite.allBodies(engine.world);
      let primaryBody: Matter.Body | null = null;

      // Trails (screen-space history, rendered in world-space)
      if (settings.showTrails) {
        const trails = trailsRef.current;
        const metaById = new Map<string, { isCharged: boolean; charge: number }>();
        for (const b of bodies) {
          const m = getBodyMeta(b);
          if (!m) continue;
          metaById.set(m.id, { isCharged: Boolean(m.isCharged), charge: m.charge });
        }

        ctx.lineWidth = 1.2 / camera.zoom;
        for (const [id, pts] of trails) {
          if (pts.length < 2) continue;
          const m = metaById.get(id) ?? null;
          if (m?.isCharged && m.charge !== 0) {
            ctx.strokeStyle = m.charge > 0 ? "rgba(96, 165, 250, 0.28)" : "rgba(248, 113, 113, 0.28)";
          } else {
            ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
          }
          ctx.beginPath();
          ctx.moveTo(pts[0]!.x, pts[0]!.y);
          for (let i = 1; i < pts.length; i += 1) {
            const p = pts[i]!;
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
      }

      for (const body of bodies) {
        const meta = getBodyMeta(body);
        const isCharged = Boolean(meta?.isCharged && meta.charge !== 0);
        const isStatic = body.isStatic;
        const conveyor = getConveyorMeta(body);
        const isConveyor = Boolean(conveyor?.enabled);
        const id = meta?.id ?? null;
        const isSelected = Boolean(id && selectedBodyIdSet.has(id));
        const isPrimarySelected = Boolean(selectedBodyId && id === selectedBodyId);
        const isHovered = Boolean(hoveredId && id === hoveredId);
        if (isPrimarySelected) primaryBody = body;

        ctx.fillStyle = isStatic ? "rgba(15, 23, 42, 0.85)" : "rgba(15, 23, 42, 0.95)";
        ctx.strokeStyle = isStatic ? "rgba(148, 163, 184, 0.25)" : "rgba(226, 232, 240, 0.25)";
        ctx.lineWidth = 1.25 / camera.zoom;
        ctx.shadowBlur = 0;

        if (isConveyor) {
          ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
          ctx.strokeStyle = "rgba(20, 184, 166, 0.55)";
          ctx.shadowColor = "rgba(20, 184, 166, 0.25)";
          ctx.shadowBlur = 14 / camera.zoom;
        }

        if (isCharged) {
          const glow =
            (meta?.charge ?? 0) > 0 ? "rgba(59, 130, 246, 0.75)" : "rgba(239, 68, 68, 0.75)";
          ctx.shadowColor = glow;
          ctx.shadowBlur = 18 / camera.zoom;
          ctx.strokeStyle = glow;
        }

        ctx.beginPath();
        if (body.circleRadius) {
          ctx.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
        } else {
          const v0 = body.vertices[0];
          ctx.moveTo(v0.x, v0.y);
          for (let i = 1; i < body.vertices.length; i += 1) {
            const v = body.vertices[i];
            ctx.lineTo(v.x, v.y);
          }
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        if (isConveyor && conveyor) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(20, 184, 166, 0.75)";
          ctx.lineWidth = 1.5 / camera.zoom;
          const sign = conveyor.speed >= 0 ? 1 : -1;
          const tangent = { x: Math.cos(body.angle) * sign, y: Math.sin(body.angle) * sign };
          const len = (26 + Math.min(4, Math.abs(conveyor.speed)) * 10) / camera.zoom;
          drawArrow(ctx, body.position.x, body.position.y, tangent.x, tangent.y, len, 6 / camera.zoom);
        }

        if (isHovered || isSelected) {
          ctx.shadowBlur = 0;
          ctx.lineWidth = (isPrimarySelected ? 2.75 : isSelected ? 2.25 : 2) / camera.zoom;
          ctx.strokeStyle = isPrimarySelected
            ? "rgba(59, 130, 246, 0.9)"
            : isSelected
              ? "rgba(56, 189, 248, 0.65)"
              : "rgba(148, 163, 184, 0.7)";
          ctx.stroke();
        }
      }

      if (settings.showVelocityVectors) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
        ctx.lineWidth = 1.25 / camera.zoom;
        for (const body of bodies) {
          if (body.isStatic) continue;
          const speed = Math.hypot(body.velocity.x, body.velocity.y);
          if (speed < 0.05) continue;
          const len = Math.min(160, speed * 18);
          drawArrow(ctx, body.position.x, body.position.y, body.velocity.x, body.velocity.y, len, 6 / camera.zoom);
        }
      }

      // Constraints
      const constraints = Matter.Composite.allConstraints(engine.world);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = 1 / camera.zoom;
      for (const c of constraints) {
        const a = c.bodyA ? Matter.Vector.add(c.bodyA.position, c.pointA) : c.pointA;
        const b = c.bodyB ? Matter.Vector.add(c.bodyB.position, c.pointB) : c.pointB;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      const pointerWorld = lastPointerWorldRef.current;
      const interaction = interactionRef.current;

      // Box select overlay
      if (interaction.kind === "box_select") {
        const a = interaction.startWorld;
        const b = interaction.currentWorld;
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const w = Math.abs(b.x - a.x);
        const h = Math.abs(b.y - a.y);
        ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
        ctx.strokeStyle = "rgba(59, 130, 246, 0.9)";
        ctx.lineWidth = 1.5 / camera.zoom;
        ctx.setLineDash([10 / camera.zoom, 7 / camera.zoom]);
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Selection handles (single body)
      if (settings.tool === "select" && primaryBody && selectedBodyIdSet.size === 1) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        if (primaryBody.circleRadius) {
          const r = primaryBody.circleRadius;
          minX = primaryBody.position.x - r;
          maxX = primaryBody.position.x + r;
          minY = primaryBody.position.y - r;
          maxY = primaryBody.position.y + r;
        } else {
          for (const v of primaryBody.vertices) {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
            maxY = Math.max(maxY, v.y);
          }
        }

        if (Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)) {
          ctx.strokeStyle = "rgba(59, 130, 246, 0.55)";
          ctx.lineWidth = 1.25 / camera.zoom;
          ctx.setLineDash([8 / camera.zoom, 6 / camera.zoom]);
          ctx.beginPath();
          ctx.rect(minX, minY, maxX - minX, maxY - minY);
          ctx.stroke();
          ctx.setLineDash([]);

          const handleR = 6.5 / camera.zoom;
          const corners = [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY }
          ];
          ctx.fillStyle = "rgba(59, 130, 246, 0.85)";
          for (const p of corners) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, handleR, 0, Math.PI * 2);
            ctx.fill();
          }

          const midX = (minX + maxX) / 2;
          const rotateY = minY - 28 / camera.zoom;
          ctx.strokeStyle = "rgba(59, 130, 246, 0.55)";
          ctx.lineWidth = 1.25 / camera.zoom;
          ctx.beginPath();
          ctx.moveTo(midX, minY);
          ctx.lineTo(midX, rotateY);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(midX, rotateY, handleR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Field handles (selected field)
      if (settings.tool === "select" && selectedField) {
        const handleR = 6.5 / camera.zoom;
        ctx.fillStyle =
          selectedField.kind === "electric" ? "rgba(59, 130, 246, 0.85)" : "rgba(34, 197, 94, 0.85)";
        ctx.strokeStyle =
          selectedField.kind === "electric" ? "rgba(147, 197, 253, 0.6)" : "rgba(134, 239, 172, 0.6)";
        ctx.lineWidth = 1.25 / camera.zoom;

        ctx.beginPath();
        ctx.arc(selectedField.x, selectedField.y, handleR, 0, Math.PI * 2);
        ctx.fill();

        if (selectedField.shape === "rect") {
          const w = selectedField.width ?? 0;
          const h = selectedField.height ?? 0;
          const corners = [
            { x: selectedField.x - w / 2, y: selectedField.y - h / 2 },
            { x: selectedField.x + w / 2, y: selectedField.y - h / 2 },
            { x: selectedField.x + w / 2, y: selectedField.y + h / 2 },
            { x: selectedField.x - w / 2, y: selectedField.y + h / 2 }
          ];
          for (const p of corners) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, handleR, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          const r = selectedField.radius ?? 0;
          const p = { x: selectedField.x + r, y: selectedField.y };
          ctx.beginPath();
          ctx.arc(p.x, p.y, handleR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Constraint endpoint handles (point anchors)
      if (settings.tool === "select") {
        const constraints = Matter.Composite.allConstraints(engine.world);
        const handleR = 5.5 / camera.zoom;
        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        for (const c of constraints) {
          if (c.bodyA && !c.bodyB && c.pointB) {
            ctx.beginPath();
            ctx.arc(c.pointB.x, c.pointB.y, handleR, 0, Math.PI * 2);
            ctx.fill();
          } else if (c.bodyB && !c.bodyA && c.pointA) {
            ctx.beginPath();
            ctx.arc(c.pointA.x, c.pointA.y, handleR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Constraint preview
      if (interaction.kind === "constraint" && pointerWorld) {
        ctx.strokeStyle = "rgba(59, 130, 246, 0.7)";
        ctx.lineWidth = 1.5 / camera.zoom;
        ctx.setLineDash([10 / camera.zoom, 8 / camera.zoom]);
        ctx.beginPath();
        ctx.moveTo(interaction.startBody.position.x, interaction.startBody.position.y);
        ctx.lineTo(pointerWorld.x, pointerWorld.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Drawing preview
      if (interaction.kind === "draw") {
        const { startWorld, currentWorld } = interaction;
        const dx = currentWorld.x - startWorld.x;
        const dy = currentWorld.y - startWorld.y;
        ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
        ctx.lineWidth = 1.75 / camera.zoom;
        ctx.setLineDash([10 / camera.zoom, 8 / camera.zoom]);
        ctx.beginPath();

        if (
          interaction.tool === "circle" ||
          interaction.tool === "polygon" ||
          interaction.tool === "field_e_circle" ||
          interaction.tool === "field_b_circle"
        ) {
          const r = Math.max(6, Math.hypot(dx, dy));
          ctx.arc(startWorld.x, startWorld.y, r, 0, Math.PI * 2);
        } else if (interaction.tool === "slope") {
          const len = Math.max(20, Math.hypot(dx, dy));
          const angle = Math.atan2(dy, dx);
          const thickness = 20;
          ctx.save();
          ctx.translate((startWorld.x + currentWorld.x) / 2, (startWorld.y + currentWorld.y) / 2);
          ctx.rotate(angle);
          ctx.rect(-len / 2, -thickness / 2, len, thickness);
          ctx.restore();
        } else if (interaction.tool === "track") {
          const p0 = startWorld;
          const p2 = currentWorld;
          const len = Math.hypot(dx, dy);
          const curvature = Math.min(260, Math.max(70, len * 0.35));
          const midX = (p0.x + p2.x) / 2;
          const midY = (p0.y + p2.y) / 2;
          let nx = -dy;
          let ny = dx;
          const nLen = Math.hypot(nx, ny) || 1;
          nx /= nLen;
          ny /= nLen;
          if (ny > 0) {
            nx = -nx;
            ny = -ny;
          }
          const cx = midX + nx * curvature;
          const cy = midY + ny * curvature;
          ctx.moveTo(p0.x, p0.y);
          ctx.quadraticCurveTo(cx, cy, p2.x, p2.y);
        } else {
          const x = Math.min(startWorld.x, currentWorld.x);
          const y = Math.min(startWorld.y, currentWorld.y);
          const w = Math.max(8, Math.abs(dx));
          const h = Math.max(8, Math.abs(dy));
          ctx.rect(x, y, w, h);
        }

        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Collision points
      if (settings.showCollisionPoints) {
        const ttlMs = 450;
        const cutoff = now - ttlMs;
        collisionsRef.current = collisionsRef.current.filter((p) => p.t >= cutoff);
        ctx.fillStyle = "rgba(250, 204, 21, 0.9)";
        for (const p of collisionsRef.current) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2 / camera.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Measurement overlay
      const measurement = measurementRef.current;
      if (measurement) {
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (measurement.kind === "ruler") {
          const a = measurement.a;
          const b = measurement.b;
          ctx.strokeStyle = "rgba(59, 130, 246, 0.9)";
          ctx.lineWidth = 2 / camera.zoom;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
          ctx.font = `${12 / camera.zoom}px ui-sans-serif, system-ui, -apple-system`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const distM = worldToMeters(Math.hypot(b.x - a.x, b.y - a.y));
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const label = `${distM.toFixed(3)} m`;
          ctx.strokeStyle = "rgba(2, 6, 23, 0.9)";
          ctx.lineWidth = 4 / camera.zoom;
          ctx.strokeText(label, midX, midY - 8 / camera.zoom);
          ctx.fillText(label, midX, midY - 8 / camera.zoom);
        } else {
          const v = measurement.vertex;
          const a = measurement.a;
          const b = measurement.b;

          ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
          ctx.lineWidth = 2 / camera.zoom;
          ctx.beginPath();
          ctx.moveTo(v.x, v.y);
          ctx.lineTo(a.x, a.y);
          ctx.stroke();

          if (b) {
            ctx.strokeStyle = "rgba(168, 85, 247, 0.85)";
            ctx.beginPath();
            ctx.moveTo(v.x, v.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            const va = { x: a.x - v.x, y: a.y - v.y };
            const vb = { x: b.x - v.x, y: b.y - v.y };
            const la = Math.hypot(va.x, va.y) || 1;
            const lb = Math.hypot(vb.x, vb.y) || 1;
            const na = { x: va.x / la, y: va.y / la };
            const nb = { x: vb.x / lb, y: vb.y / lb };
            const dot = na.x * nb.x + na.y * nb.y;
            const cross = na.x * nb.y - na.y * nb.x;
            const angleRad = Math.atan2(cross, dot);
            const absDeg = (Math.abs(angleRad) * 180) / Math.PI;

            const start = Math.atan2(va.y, va.x);
            const end = start + angleRad;
            const r = Math.max(48, Math.min(140, Math.min(la, lb) * 0.45));
            ctx.strokeStyle = "rgba(226, 232, 240, 0.5)";
            ctx.lineWidth = 1.5 / camera.zoom;
            ctx.beginPath();
            ctx.arc(v.x, v.y, r, start, end, angleRad < 0);
            ctx.stroke();

            // label along angle bisector
            let bx = na.x + nb.x;
            let by = na.y + nb.y;
            const bl = Math.hypot(bx, by);
            if (bl > 1e-6) {
              bx /= bl;
              by /= bl;
            } else {
              bx = na.y;
              by = -na.x;
            }
            const labelX = v.x + bx * (r + 20);
            const labelY = v.y + by * (r + 20);

            const label = `${absDeg.toFixed(2)}°`;
            ctx.font = `${12 / camera.zoom}px ui-sans-serif, system-ui, -apple-system`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.strokeStyle = "rgba(2, 6, 23, 0.9)";
            ctx.lineWidth = 4 / camera.zoom;
            ctx.strokeText(label, labelX, labelY);
            ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
            ctx.fillText(label, labelX, labelY);
          }
        }
      }

      ctx.restore();

      // HUD
      ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
      ctx.font = "12px ui-sans-serif, system-ui, -apple-system";
      ctx.fillText(`Bodies: ${Matter.Composite.allBodies(engine.world).length}`, 16, 28);
      ctx.fillText(`Tool: ${settings.tool}`, 16, 46);
      ctx.fillText(`Camera: (${camera.x.toFixed(0)}, ${camera.y.toFixed(0)}) z=${camera.zoom.toFixed(2)}`, 16, 64);

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(raf);
      Matter.Events.off(engine, "collisionStart", onCollisionStart);
      Matter.Engine.clear(engine);
      engineRef.current = null;
    };
  }, [engineRef, resetNonce, setHoverReadout, setHoveredBodyId, stepRequestedRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const camera = cameraRef.current;

      if (e.ctrlKey) {
        const before = screenToWorld(mouse.x, mouse.y, rect);
        const nextZoom = Math.min(3.5, Math.max(0.25, camera.zoom * (1 - e.deltaY * 0.001)));
        camera.zoom = nextZoom;
        const after = screenToWorld(mouse.x, mouse.y, rect);
        camera.x += before.x - after.x;
        camera.y += before.y - after.y;
        return;
      }

      camera.x += e.deltaX / camera.zoom;
      camera.y += e.deltaY / camera.zoom;
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [screenToWorld]);

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const engine = engineRef.current;
          if (!engine) return;
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          lastPointerScreenRef.current = { x, y };
          const world = screenToWorld(x, y, rect);
          lastPointerWorldRef.current = world;
          pointerWorldRef.current = world;

          const shouldPan = tool === "pan" || e.button === 1 || e.altKey;
          if (shouldPan) {
            interactionRef.current = {
              kind: "pan",
              pointerId: e.pointerId,
              startX: x,
              startY: y,
              startCameraX: cameraRef.current.x,
              startCameraY: cameraRef.current.y
            };
            canvas.setPointerCapture(e.pointerId);
            return;
          }

          if (tool === "ruler") {
            const p = snapWorld(world);
            measurementRef.current = { kind: "ruler", a: p, b: p };
            interactionRef.current = { kind: "measure_ruler", pointerId: e.pointerId, startWorld: p, currentWorld: p };
            canvas.setPointerCapture(e.pointerId);
            return;
          }

          if (tool === "protractor") {
            const p = snapWorld(world);
            const existing = measurementRef.current;
            if (existing?.kind === "protractor" && existing.b === null) {
              measurementRef.current = { ...existing, b: p };
              interactionRef.current = {
                kind: "measure_protractor",
                pointerId: e.pointerId,
                phase: 2,
                vertexWorld: existing.vertex,
                ray1World: existing.a,
                currentWorld: p
              };
            } else {
              measurementRef.current = { kind: "protractor", vertex: p, a: p, b: null };
              interactionRef.current = {
                kind: "measure_protractor",
                pointerId: e.pointerId,
                phase: 1,
                vertexWorld: p,
                ray1World: p,
                currentWorld: p
              };
            }
            canvas.setPointerCapture(e.pointerId);
            return;
          }

          if (
            tool === "circle" ||
            tool === "rectangle" ||
            tool === "polygon" ||
            tool === "wall" ||
            tool === "slope" ||
            tool === "conveyor" ||
            tool === "track" ||
            tool === "field_e_rect" ||
            tool === "field_e_circle" ||
            tool === "field_b_rect" ||
            tool === "field_b_circle"
          ) {
            interactionRef.current = {
              kind: "draw",
              pointerId: e.pointerId,
              tool,
              startWorld: snapWorld(world),
              currentWorld: snapWorld(world)
            };
            canvas.setPointerCapture(e.pointerId);
            return;
          }

          if (tool === "rod" || tool === "spring" || tool === "rope") {
            const body = queryBodyAtPoint(engine, world);
            if (!body) return;

            const meta = ensureBodyMeta(body, { label: body.label || "Body" });
            selectBody(meta.id);

            interactionRef.current = {
              kind: "constraint",
              pointerId: e.pointerId,
              tool,
              startBody: body,
              startBodyMetaId: meta.id
            };
            canvas.setPointerCapture(e.pointerId);
            return;
          }

          if (tool === "select") {
            const zoom = cameraRef.current.zoom;
            const handleHitR = 10 / Math.max(zoom, 0.0001);
            const hitR2 = handleHitR * handleHitR;

            // Constraint anchor endpoint (point constraints)
            for (const c of Matter.Composite.allConstraints(engine.world)) {
              if (c.bodyA && !c.bodyB && c.pointB) {
                const dx = world.x - c.pointB.x;
                const dy = world.y - c.pointB.y;
                if (dx * dx + dy * dy <= hitR2) {
                  interactionRef.current = { kind: "drag_constraint_anchor", pointerId: e.pointerId, constraint: c, which: "pointB" };
                  canvas.setPointerCapture(e.pointerId);
                  return;
                }
              } else if (c.bodyB && !c.bodyA && c.pointA) {
                const dx = world.x - c.pointA.x;
                const dy = world.y - c.pointA.y;
                if (dx * dx + dy * dy <= hitR2) {
                  interactionRef.current = { kind: "drag_constraint_anchor", pointerId: e.pointerId, constraint: c, which: "pointA" };
                  canvas.setPointerCapture(e.pointerId);
                  return;
                }
              }
            }

            // Field handles
            const selectedEntity = selectedRef.current;
            if (selectedEntity.kind === "field") {
              const field = fieldsRef.current.find((f) => f.id === selectedEntity.id) ?? null;
              if (field) {
                const center = { x: field.x, y: field.y };
                const dx = world.x - center.x;
                const dy = world.y - center.y;
                if (dx * dx + dy * dy <= hitR2) {
                  interactionRef.current = {
                    kind: "move_field",
                    pointerId: e.pointerId,
                    fieldId: field.id,
                    startWorld: world,
                    startField: { ...field } as FieldRegion
                  };
                  canvas.setPointerCapture(e.pointerId);
                  return;
                }

                if (field.shape === "rect") {
                  const w = field.width ?? 0;
                  const h = field.height ?? 0;
                  const corners = [
                    { x: field.x - w / 2, y: field.y - h / 2 },
                    { x: field.x + w / 2, y: field.y - h / 2 },
                    { x: field.x + w / 2, y: field.y + h / 2 },
                    { x: field.x - w / 2, y: field.y + h / 2 }
                  ];
                  for (const p of corners) {
                    const ddx = world.x - p.x;
                    const ddy = world.y - p.y;
                    if (ddx * ddx + ddy * ddy <= hitR2) {
                      interactionRef.current = {
                        kind: "resize_field",
                        pointerId: e.pointerId,
                        fieldId: field.id,
                        handle: "corner",
                        startWorld: world,
                        startField: { ...field } as FieldRegion
                      };
                      canvas.setPointerCapture(e.pointerId);
                      return;
                    }
                  }
                } else {
                  const r = field.radius ?? 0;
                  const p = { x: field.x + r, y: field.y };
                  const ddx = world.x - p.x;
                  const ddy = world.y - p.y;
                  if (ddx * ddx + ddy * ddy <= hitR2) {
                    interactionRef.current = {
                      kind: "resize_field",
                      pointerId: e.pointerId,
                      fieldId: field.id,
                      handle: "radius",
                      startWorld: world,
                      startField: { ...field } as FieldRegion
                    };
                    canvas.setPointerCapture(e.pointerId);
                    return;
                  }
                }
              }
            }

            // Body handles (single selection)
            if (selectedEntity.kind === "body" && selectedBodyIdsRef.current.length <= 1) {
              const body = findBodyByMetaId(engine, selectedEntity.id);
              if (body) {
                let minX = Infinity;
                let minY = Infinity;
                let maxX = -Infinity;
                let maxY = -Infinity;
                if (body.circleRadius) {
                  const r = body.circleRadius;
                  minX = body.position.x - r;
                  maxX = body.position.x + r;
                  minY = body.position.y - r;
                  maxY = body.position.y + r;
                } else {
                  for (const v of body.vertices) {
                    minX = Math.min(minX, v.x);
                    maxX = Math.max(maxX, v.x);
                    minY = Math.min(minY, v.y);
                    maxY = Math.max(maxY, v.y);
                  }
                }

                if (Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)) {
                  const midX = (minX + maxX) / 2;
                  const rotateY = minY - 28 / Math.max(zoom, 0.0001);
                  const ddx = world.x - midX;
                  const ddy = world.y - rotateY;
                  if (ddx * ddx + ddy * ddy <= hitR2) {
                    const center = { x: body.position.x, y: body.position.y };
                    const base = Math.atan2(world.y - center.y, world.x - center.x);
                    interactionRef.current = {
                      kind: "rotate_body",
                      pointerId: e.pointerId,
                      bodyId: selectedEntity.id,
                      center,
                      angleOffset: body.angle - base
                    };
                    canvas.setPointerCapture(e.pointerId);
                    return;
                  }

                  const corners = [
                    { x: minX, y: minY },
                    { x: maxX, y: minY },
                    { x: maxX, y: maxY },
                    { x: minX, y: maxY }
                  ];
                  for (const p of corners) {
                    const ddx2 = world.x - p.x;
                    const ddy2 = world.y - p.y;
                    if (ddx2 * ddx2 + ddy2 * ddy2 <= hitR2) {
                      const center = { x: body.position.x, y: body.position.y };
                      const dist = Math.hypot(world.x - center.x, world.y - center.y);
                      if (dist <= 1e-6) break;
                      interactionRef.current = {
                        kind: "resize_body",
                        pointerId: e.pointerId,
                        bodyId: selectedEntity.id,
                        center,
                        startDist: dist,
                        lastScale: 1,
                        initialShape: getBodyShape(body) ?? inferBodyShape(body)
                      };
                      canvas.setPointerCapture(e.pointerId);
                      return;
                    }
                  }
                }
              }
            }

            // Prefer selecting bodies over fields
            const hitBody = queryBodyAtPoint(engine, world);
            if (hitBody) {
              const meta = ensureBodyMeta(hitBody, { label: hitBody.label || "Body" });
              interactionRef.current = {
                kind: "select_press",
                pointerId: e.pointerId,
                startScreen: { x, y },
                startWorld: world,
                shiftKey: e.shiftKey,
                hit: { kind: "body", body: hitBody, bodyMetaId: meta.id }
              };
              canvas.setPointerCapture(e.pointerId);
              return;
            }

            const hitField = queryFieldAtPoint(fieldsRef.current, world);
            if (hitField) {
              interactionRef.current = {
                kind: "select_press",
                pointerId: e.pointerId,
                startScreen: { x, y },
                startWorld: world,
                shiftKey: e.shiftKey,
                hit: { kind: "field", fieldId: hitField.id }
              };
              canvas.setPointerCapture(e.pointerId);
              return;
            }

            interactionRef.current = {
              kind: "select_press",
              pointerId: e.pointerId,
              startScreen: { x, y },
              startWorld: world,
              shiftKey: e.shiftKey,
              hit: { kind: "empty" }
            };
            canvas.setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const engine = engineRef.current;
          if (!engine) return;
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          lastPointerScreenRef.current = { x, y };
          const world = screenToWorld(x, y, rect);
          lastPointerWorldRef.current = world;
          pointerWorldRef.current = world;

          const interaction = interactionRef.current;
          if (interaction.kind === "pan" && interaction.pointerId === e.pointerId) {
            const dx = x - interaction.startX;
            const dy = y - interaction.startY;
            cameraRef.current.x = interaction.startCameraX - dx / cameraRef.current.zoom;
            cameraRef.current.y = interaction.startCameraY - dy / cameraRef.current.zoom;
            return;
          }
          if (interaction.kind === "measure_ruler" && interaction.pointerId === e.pointerId) {
            const p = snapWorld(world);
            interactionRef.current = { ...interaction, currentWorld: p };
            measurementRef.current = { kind: "ruler", a: interaction.startWorld, b: p };
            return;
          }
          if (interaction.kind === "measure_protractor" && interaction.pointerId === e.pointerId) {
            const p = snapWorld(world);
            interactionRef.current = { ...interaction, currentWorld: p };
            if (interaction.phase === 1) {
              measurementRef.current = { kind: "protractor", vertex: interaction.vertexWorld, a: p, b: null };
            } else {
              measurementRef.current = { kind: "protractor", vertex: interaction.vertexWorld, a: interaction.ray1World, b: p };
            }
            return;
          }
          if (interaction.kind === "draw" && interaction.pointerId === e.pointerId) {
            interactionRef.current = { ...interaction, currentWorld: snapWorld(world) };
            return;
          }
          if (interaction.kind === "constraint" && interaction.pointerId === e.pointerId) {
            return;
          }
          if (interaction.kind === "drag_constraint_anchor" && interaction.pointerId === e.pointerId) {
            const p = snapWorld(world);
            if (interaction.which === "pointB") interaction.constraint.pointB = p;
            else interaction.constraint.pointA = p;
            return;
          }
          if (interaction.kind === "move_field" && interaction.pointerId === e.pointerId) {
            const dx = world.x - interaction.startWorld.x;
            const dy = world.y - interaction.startWorld.y;
            let next = { ...interaction.startField, x: interaction.startField.x + dx, y: interaction.startField.y + dy } as FieldRegion;
            if (snapEnabled) {
              const snapped = snapWorld({ x: next.x, y: next.y });
              next = { ...next, x: snapped.x, y: snapped.y } as FieldRegion;
            }
            setFields((prev) => {
              const updated = prev.map((f) => (f.id === interaction.fieldId ? next : f));
              fieldsRef.current = updated;
              return updated;
            });
            return;
          }
          if (interaction.kind === "resize_field" && interaction.pointerId === e.pointerId) {
            const start = interaction.startField;
            const p = snapEnabled ? snapWorld(world) : world;
            let next: FieldRegion = start;
            if (start.shape === "circle") {
              const r = Math.max(24, Math.hypot(p.x - start.x, p.y - start.y));
              next = { ...start, radius: r } as FieldRegion;
            } else {
              const w = Math.max(40, Math.abs(p.x - start.x) * 2);
              const h = Math.max(40, Math.abs(p.y - start.y) * 2);
              next = { ...start, width: w, height: h } as FieldRegion;
            }
            setFields((prev) => {
              const updated = prev.map((f) => (f.id === interaction.fieldId ? next : f));
              fieldsRef.current = updated;
              return updated;
            });
            return;
          }
          if (interaction.kind === "rotate_body" && interaction.pointerId === e.pointerId) {
            const body = findBodyByMetaId(engine, interaction.bodyId);
            if (!body) return;
            const angle = Math.atan2(world.y - interaction.center.y, world.x - interaction.center.x) + interaction.angleOffset;
            Matter.Body.setAngle(body, angle);
            Matter.Body.setAngularVelocity(body, 0);
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
            return;
          }
          if (interaction.kind === "resize_body" && interaction.pointerId === e.pointerId) {
            const body = findBodyByMetaId(engine, interaction.bodyId);
            if (!body) return;
            const dist = Math.hypot(world.x - interaction.center.x, world.y - interaction.center.y);
            const desired = Math.min(6, Math.max(0.2, dist / Math.max(1e-6, interaction.startDist)));
            const factor = desired / Math.max(1e-6, interaction.lastScale);
            Matter.Body.scale(body, factor, factor);
            Matter.Body.setAngularVelocity(body, 0);
            Matter.Body.setVelocity(body, { x: 0, y: 0 });

            const init = interaction.initialShape;
            if (init) {
              if (init.kind === "circle") setBodyShape(body, { kind: "circle", radius: init.radius * desired });
              else if (init.kind === "rectangle") setBodyShape(body, { kind: "rectangle", width: init.width * desired, height: init.height * desired });
              else setBodyShape(body, { kind: "polygon", sides: init.sides, radius: init.radius * desired });
            }
            const meta = ensureBodyMeta(body);
            meta.volume = Math.max(1, body.area);
            meta.density = body.mass / meta.volume;

            interactionRef.current = { ...interaction, lastScale: desired };
            return;
          }
          if (interaction.kind === "move_selection" && interaction.pointerId === e.pointerId) {
            const deltaBase = { x: world.x - interaction.startWorld.x, y: world.y - interaction.startWorld.y };
            let dx = deltaBase.x;
            let dy = deltaBase.y;

            const primaryStart = interaction.starts.find((s) => s.id === interaction.primaryId) ?? null;
            if (snapEnabled && primaryStart) {
              const snapped = snapWorld({ x: primaryStart.x + dx, y: primaryStart.y + dy });
              dx = snapped.x - primaryStart.x;
              dy = snapped.y - primaryStart.y;
            }

            for (const s of interaction.starts) {
              const body = findBodyByMetaId(engine, s.id);
              if (!body) continue;
              Matter.Body.setPosition(body, { x: s.x + dx, y: s.y + dy });
              Matter.Body.setVelocity(body, { x: 0, y: 0 });
              Matter.Body.setAngularVelocity(body, 0);
            }
            return;
          }
          if (interaction.kind === "box_select" && interaction.pointerId === e.pointerId) {
            interactionRef.current = { ...interaction, currentWorld: snapWorld(world) };
            return;
          }
          if (interaction.kind === "select_press" && interaction.pointerId === e.pointerId) {
            const dx = x - interaction.startScreen.x;
            const dy = y - interaction.startScreen.y;
            if (dx * dx + dy * dy < 16) return; // 4px

            if (interaction.hit.kind === "body") {
              const clickedId = interaction.hit.bodyMetaId;
              const prevIds = selectedBodyIdsRef.current;
              let nextIds: string[];
              if (interaction.shiftKey) {
                const set = new Set(prevIds);
                set.add(clickedId);
                nextIds = Array.from(set);
              } else {
                nextIds = [clickedId];
              }

              if (nextIds.length === 1) selectBody(clickedId);
              else setSelectedBodies(nextIds, { primaryId: clickedId });

              const starts: Array<{ id: string; x: number; y: number }> = [];
              for (const id of nextIds) {
                const b = findBodyByMetaId(engine, id);
                if (!b) continue;
                starts.push({ id, x: b.position.x, y: b.position.y });
              }
              interactionRef.current = {
                kind: "move_selection",
                pointerId: e.pointerId,
                startWorld: interaction.startWorld,
                primaryId: clickedId,
                bodyIds: nextIds,
                starts
              };
              return;
            }

            if (interaction.hit.kind === "field") {
              const fieldId = interaction.hit.fieldId;
              const field = fieldsRef.current.find((f) => f.id === fieldId) ?? null;
              if (!field) return;
              selectField(field.id);
              interactionRef.current = {
                kind: "move_field",
                pointerId: e.pointerId,
                fieldId: field.id,
                startWorld: interaction.startWorld,
                startField: { ...field } as FieldRegion
              };
              return;
            }

            interactionRef.current = {
              kind: "box_select",
              pointerId: e.pointerId,
              startWorld: interaction.startWorld,
              currentWorld: snapWorld(world),
              additive: interaction.shiftKey,
              baseSelection: interaction.shiftKey ? selectedBodyIdsRef.current : []
            };
            return;
          }

          const body = queryBodyAtPoint(engine, world);
          if (!body) {
            setHoveredBodyId(null);
            setHoverReadout(null);
            return;
          }
          const meta = ensureBodyMeta(body, { label: body.label || "Body" });
          const dtMs = (body as any).deltaTime || engine.timing.lastDelta || BASE_DELTA_MS;
          const v = worldVelocityStepToMps(Math.hypot(body.velocity.x, body.velocity.y), dtMs);
          const ke = 0.5 * body.mass * v * v;
	          const f = forceByBodyIdRef.current.get(meta.id) ?? 0;
          setHoveredBodyId(meta.id);
          setHoverReadout({ screenX: x, screenY: y, velocity: v, force: f, kineticEnergy: ke });
        }}
        onPointerUp={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const engine = engineRef.current;
          if (!engine) return;

          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          lastPointerScreenRef.current = { x, y };
          const world = screenToWorld(x, y, rect);
          lastPointerWorldRef.current = world;
          pointerWorldRef.current = world;

          const interaction = interactionRef.current;
          if (interaction.kind === "measure_ruler" && interaction.pointerId === e.pointerId) {
            const p = snapWorld(world);
            measurementRef.current = { kind: "ruler", a: interaction.startWorld, b: p };
            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }

          if (interaction.kind === "measure_protractor" && interaction.pointerId === e.pointerId) {
            const p = snapWorld(world);
            if (interaction.phase === 1) {
              measurementRef.current = { kind: "protractor", vertex: interaction.vertexWorld, a: p, b: null };
            } else {
              measurementRef.current = { kind: "protractor", vertex: interaction.vertexWorld, a: interaction.ray1World, b: p };
            }
            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }

          if (interaction.kind === "select_press" && interaction.pointerId === e.pointerId) {
            if (interaction.hit.kind === "body") {
              if (interaction.shiftKey) selectBody(interaction.hit.bodyMetaId, { additive: true, toggle: true });
              else selectBody(interaction.hit.bodyMetaId);
            } else if (interaction.hit.kind === "field") {
              selectField(interaction.hit.fieldId);
            } else {
              if (!interaction.shiftKey) clearSelection();
            }
            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }

          if (interaction.kind === "box_select" && interaction.pointerId === e.pointerId) {
            const a = interaction.startWorld;
            const b = interaction.currentWorld;
            const left = Math.min(a.x, b.x);
            const right = Math.max(a.x, b.x);
            const top = Math.min(a.y, b.y);
            const bottom = Math.max(a.y, b.y);

            const nextIds: string[] = [];
            for (const body of Matter.Composite.allBodies(engine.world)) {
              if (body.position.x < left || body.position.x > right) continue;
              if (body.position.y < top || body.position.y > bottom) continue;
              const meta = ensureBodyMeta(body, { label: body.label || "Body" });
              nextIds.push(meta.id);
            }

            if (nextIds.length > 0) {
              if (interaction.additive) {
                const set = new Set([...interaction.baseSelection, ...nextIds]);
                const arr = Array.from(set);
                setSelectedBodies(arr, { primaryId: nextIds[nextIds.length - 1] ?? null });
              } else {
                setSelectedBodies(nextIds, { primaryId: nextIds[nextIds.length - 1] ?? null });
              }
            } else {
              if (!interaction.additive) clearSelection();
            }

            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }

          if (interaction.kind === "move_selection" && interaction.pointerId === e.pointerId) {
            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }

          if (interaction.kind === "rotate_body" && interaction.pointerId === e.pointerId) {
            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }

          if (interaction.kind === "resize_body" && interaction.pointerId === e.pointerId) {
            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }

          if ((interaction.kind === "move_field" || interaction.kind === "resize_field") && interaction.pointerId === e.pointerId) {
            const after = fieldsRef.current.find((f) => f.id === interaction.fieldId) ?? null;
            if (after) commitFieldChange({ fieldId: interaction.fieldId, before: interaction.startField, after });
            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }

          if (interaction.kind === "drag_constraint_anchor" && interaction.pointerId === e.pointerId) {
            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }

          if (interaction.kind === "constraint" && interaction.pointerId === e.pointerId) {
            const selectionBefore = selectedRef.current;
            const startBody = interaction.startBody;
            const startId = interaction.startBodyMetaId;
            const endBody = queryBodyAtPoint(engine, world);

            if (endBody && endBody.id !== startBody.id) {
              const endMeta = ensureBodyMeta(endBody, { label: endBody.label || "Body" });
              if (interaction.tool === "rope") {
                const rope = addRopeChain(startBody, endBody);
                commitWorldAdd({
                  bodies: rope.bodies,
                  constraints: rope.constraints,
                  selectionBefore,
                  selectionAfter: { kind: "body", id: endMeta.id }
                });
              } else {
                const constraint = createConstraintBetweenBodies(interaction.tool, startBody, endBody);
                commitWorldAdd({
                  constraints: [constraint],
                  selectionBefore,
                  selectionAfter: { kind: "body", id: endMeta.id }
                });
              }
            } else if (!endBody) {
              const endPoint = snapWorld(world);
              const dist = Math.hypot(endPoint.x - startBody.position.x, endPoint.y - startBody.position.y);
              if (dist > 24) {
                if (interaction.tool === "rope") {
                  const rope = addRopeChainToPoint(startBody, endPoint);
                  commitWorldAdd({
                    bodies: rope.bodies,
                    constraints: rope.constraints,
                    selectionBefore,
                    selectionAfter: { kind: "body", id: startId }
                  });
                } else {
                  const constraint = createConstraintToPoint(interaction.tool, startBody, endPoint);
                  commitWorldAdd({
                    constraints: [constraint],
                    selectionBefore,
                    selectionAfter: { kind: "body", id: startId }
                  });
                }
              }
            }

            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }

          if (interaction.kind === "pan" && interaction.pointerId === e.pointerId) {
            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }
	          if (interaction.kind === "draw" && interaction.pointerId === e.pointerId) {
	            const toolAtDrawStart = interaction.tool;
	            const selectionBefore = selected;
	            const field = createFieldFromDraw(interaction);
	            if (field) {
	              commitFieldAdd({
	                field,
	                selectionBefore,
	                selectionAfter: { kind: "field", id: field.id }
	              });
	              interactionRef.current = { kind: "none" };
	              canvas.releasePointerCapture(e.pointerId);
	              setTool(toolAtDrawStart);
	              return;
	            }

	            const created = finalizeDraw(interaction);
	            interactionRef.current = { kind: "none" };
	            canvas.releasePointerCapture(e.pointerId);
	            if (created?.selectedId) {
	              commitWorldAdd({
	                bodies: created.bodies,
	                constraints: created.constraints,
	                selectionBefore,
	                selectionAfter: { kind: "body", id: created.selectedId }
	              });
	            }
	            setTool(toolAtDrawStart);
	          }
	        }}
        onPointerLeave={() => {
          setHoveredBodyId(null);
          setHoverReadout(null);
          lastPointerScreenRef.current = null;
          lastPointerWorldRef.current = null;
          pointerWorldRef.current = null;
        }}
        className={cn(
          "h-full w-full select-none",
          tool === "pan"
            ? "cursor-grab active:cursor-grabbing"
            : tool === "select"
              ? "cursor-default"
              : tool === "rod" || tool === "spring" || tool === "rope"
                ? "cursor-cell"
                : "cursor-crosshair"
        )}
      />
    </div>
  );
}

function queryBodyAtPoint(engine: Matter.Engine, point: WorldPoint): Matter.Body | null {
  const bodies = Matter.Composite.allBodies(engine.world);
  const found = Matter.Query.point(bodies, point);
  if (found.length === 0) return null;
  return found[found.length - 1] ?? null;
}

function createConstraintBetweenBodies(tool: "rod" | "spring", a: Matter.Body, b: Matter.Body) {
  const len = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
  if (tool === "rod") {
    return Matter.Constraint.create({ bodyA: a, pointA: { x: 0, y: 0 }, bodyB: b, pointB: { x: 0, y: 0 }, length: len, stiffness: 1 });
  }
  return Matter.Constraint.create({
    bodyA: a,
    pointA: { x: 0, y: 0 },
    bodyB: b,
    pointB: { x: 0, y: 0 },
    length: len,
    stiffness: 0.03,
    damping: 0.08
  });
}

function createConstraintToPoint(tool: "rod" | "spring", a: Matter.Body, point: WorldPoint) {
  const len = Math.hypot(a.position.x - point.x, a.position.y - point.y);
  if (tool === "rod") {
    return Matter.Constraint.create({ bodyA: a, pointA: { x: 0, y: 0 }, pointB: point, length: len, stiffness: 1 });
  }
  return Matter.Constraint.create({
    bodyA: a,
    pointA: { x: 0, y: 0 },
    pointB: point,
    length: len,
    stiffness: 0.03,
    damping: 0.08
  });
}

function addRopeChain(a: Matter.Body, b: Matter.Body) {
  const start = a.position;
  const end = b.position;
  const dist = Math.hypot(start.x - end.x, start.y - end.y);

  const group = Matter.Body.nextGroup(true);
  const ropeGroupId = createId("rope");
  const segments = Math.min(18, Math.max(6, Math.floor(dist / 60)));
  const radius = 7;
  const segmentLength = dist / (segments + 1);

  const ropeBodies: Matter.Body[] = [];
  const ropeConstraints: Matter.Constraint[] = [];

  for (let i = 1; i <= segments; i += 1) {
    const t = i / (segments + 1);
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    const part = Matter.Bodies.circle(x, y, radius, {
      collisionFilter: { group },
      restitution: 0.1,
      friction: 0.2,
      frictionStatic: 0.4,
      frictionAir: 0
    });
    ensureBodyMeta(part, { label: "Rope Segment" });
    setBodyShape(part, { kind: "circle", radius });
    setBodyRopeGroup(part, ropeGroupId);
    ropeBodies.push(part);
  }

  const chain = [a, ...ropeBodies, b];
  for (let i = 1; i < chain.length; i += 1) {
    const c = Matter.Constraint.create({
      bodyA: chain[i - 1],
      bodyB: chain[i],
      length: segmentLength,
      stiffness: 0.9,
      damping: 0.02
    });
    setConstraintRopeGroup(c, ropeGroupId);
    ropeConstraints.push(c);
  }

  return { bodies: ropeBodies, constraints: ropeConstraints };
}

function addRopeChainToPoint(a: Matter.Body, endPoint: WorldPoint) {
  const start = a.position;
  const end = endPoint;
  const dist = Math.hypot(start.x - end.x, start.y - end.y);

  const group = Matter.Body.nextGroup(true);
  const ropeGroupId = createId("rope");
  const segments = Math.min(18, Math.max(6, Math.floor(dist / 60)));
  const radius = 7;
  const segmentLength = dist / (segments + 1);

  const ropeBodies: Matter.Body[] = [];
  const ropeConstraints: Matter.Constraint[] = [];

  for (let i = 1; i <= segments; i += 1) {
    const t = i / (segments + 1);
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    const part = Matter.Bodies.circle(x, y, radius, {
      collisionFilter: { group },
      restitution: 0.1,
      friction: 0.2,
      frictionStatic: 0.4,
      frictionAir: 0
    });
    ensureBodyMeta(part, { label: "Rope Segment" });
    setBodyShape(part, { kind: "circle", radius });
    setBodyRopeGroup(part, ropeGroupId);
    ropeBodies.push(part);
  }

  const chain = [a, ...ropeBodies];
  for (let i = 1; i < chain.length; i += 1) {
    const c = Matter.Constraint.create({
      bodyA: chain[i - 1],
      bodyB: chain[i],
      length: segmentLength,
      stiffness: 0.9,
      damping: 0.02
    });
    setConstraintRopeGroup(c, ropeGroupId);
    ropeConstraints.push(c);
  }

  const last = ropeBodies[ropeBodies.length - 1] ?? null;
  if (last) {
    const tail = Matter.Constraint.create({
      bodyA: last,
      pointA: { x: 0, y: 0 },
      pointB: endPoint,
      length: segmentLength,
      stiffness: 0.9,
      damping: 0.02
    });
    setConstraintRopeGroup(tail, ropeGroupId);
    ropeConstraints.push(tail);
  } else {
    const direct = Matter.Constraint.create({
      bodyA: a,
      pointA: { x: 0, y: 0 },
      pointB: endPoint,
      length: dist,
      stiffness: 0.9,
      damping: 0.02
    });
    setConstraintRopeGroup(direct, ropeGroupId);
    ropeConstraints.push(direct);
  }

  return { bodies: ropeBodies, constraints: ropeConstraints };
}

function finalizeDraw(
  interaction: Extract<Interaction, { kind: "draw" }>
): { bodies: Matter.Body[]; constraints: Matter.Constraint[]; selectedId: string | null } | null {
  const { startWorld, currentWorld, tool } = interaction;
  const dx = currentWorld.x - startWorld.x;
  const dy = currentWorld.y - startWorld.y;
  const centerX = (startWorld.x + currentWorld.x) / 2;
  const centerY = (startWorld.y + currentWorld.y) / 2;

  const opts: Matter.IBodyDefinition = {
    restitution: 0.25,
    friction: 0.12,
    frictionStatic: 0.5,
    frictionAir: 0
  };

  if (tool === "circle") {
    const r = Math.max(10, Math.hypot(dx, dy));
    const body = Matter.Bodies.circle(startWorld.x, startWorld.y, r, opts);
    const meta = ensureBodyMeta(body, { label: "Circle" });
    setBodyShape(body, { kind: "circle", radius: r });
    return { bodies: [body], constraints: [], selectedId: meta.id };
  }

  if (tool === "polygon") {
    const r = Math.max(12, Math.hypot(dx, dy));
    const sides = 5;
    const body = Matter.Bodies.polygon(startWorld.x, startWorld.y, sides, r, opts);
    const meta = ensureBodyMeta(body, { label: "Polygon" });
    setBodyShape(body, { kind: "polygon", sides, radius: r });
    return { bodies: [body], constraints: [], selectedId: meta.id };
  }

  if (tool === "slope") {
    const len = Math.max(60, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const thickness = 22;
    const body = Matter.Bodies.rectangle(centerX, centerY, len, thickness, { ...opts, isStatic: true, angle });
    const meta = ensureBodyMeta(body, { label: "Slope" });
    setBodyShape(body, { kind: "rectangle", width: len, height: thickness });
    return { bodies: [body], constraints: [], selectedId: meta.id };
  }

  if (tool === "track") {
    const p0 = startWorld;
    const p2 = currentWorld;
    const len = Math.hypot(dx, dy);
    if (len < 80) return null;

    const thickness = 18;
    const segments = Math.min(28, Math.max(10, Math.floor(len / 40)));
    const curvature = Math.min(320, Math.max(90, len * 0.45));
    const midX = (p0.x + p2.x) / 2;
    const midY = (p0.y + p2.y) / 2;

    let nx = -dy;
    let ny = dx;
    const nLen = Math.hypot(nx, ny) || 1;
    nx /= nLen;
    ny /= nLen;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const p1 = { x: midX + nx * curvature, y: midY + ny * curvature };

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
      const a = points[i];
      const b = points[i + 1];
      const segDx = b.x - a.x;
      const segDy = b.y - a.y;
      const segLen = Math.hypot(segDx, segDy);
      if (segLen < 12) continue;
      const angle = Math.atan2(segDy, segDx);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const seg = Matter.Bodies.rectangle(cx, cy, segLen, thickness, { ...opts, isStatic: true, angle });
      ensureBodyMeta(seg, { label: "Track" });
      setBodyShape(seg, { kind: "rectangle", width: segLen, height: thickness });
      bodies.push(seg);
    }

    if (bodies.length === 0) return null;
    const selectedId = getBodyMeta(bodies[0])?.id ?? null;
    return { bodies, constraints: [], selectedId };
  }

  if (tool === "conveyor") {
    const w = Math.max(80, Math.abs(dx));
    const h = Math.max(18, Math.abs(dy));
    const body = Matter.Bodies.rectangle(centerX, centerY, w, h, { ...opts, isStatic: true, friction: 0.9, frictionStatic: 1 });
    const meta = ensureBodyMeta(body, { label: "Conveyor" });
    setBodyShape(body, { kind: "rectangle", width: w, height: h });
    ensureConveyorMeta(body, { enabled: true, speed: 2, grip: 0.28 });
    return { bodies: [body], constraints: [], selectedId: meta.id };
  }

  if (tool === "rectangle" || tool === "wall") {
    const w = Math.max(24, Math.abs(dx));
    const h = Math.max(24, Math.abs(dy));
    const body = Matter.Bodies.rectangle(centerX, centerY, w, h, { ...opts, isStatic: tool === "wall" });
    const meta = ensureBodyMeta(body, { label: tool === "wall" ? "Wall" : "Rectangle" });
    setBodyShape(body, { kind: "rectangle", width: w, height: h });
    return { bodies: [body], constraints: [], selectedId: meta.id };
  }

  // Fields are handled in a later step.
  return null;
}

function queryFieldAtPoint(fields: FieldRegion[], point: WorldPoint): FieldRegion | null {
  for (let i = fields.length - 1; i >= 0; i -= 1) {
    const field = fields[i]!;
    if (isPointInField(field, point)) return field;
  }
  return null;
}

function createFieldFromDraw(interaction: Extract<Interaction, { kind: "draw" }>): FieldRegion | null {
  const { tool, startWorld, currentWorld } = interaction;
  if (!tool.startsWith("field_")) return null;

  const dx = currentWorld.x - startWorld.x;
  const dy = currentWorld.y - startWorld.y;
  const centerX = (startWorld.x + currentWorld.x) / 2;
  const centerY = (startWorld.y + currentWorld.y) / 2;

  const id = createId("field");
  const isElectric = tool.startsWith("field_e_");
  const shape = tool.endsWith("_circle") ? "circle" : "rect";

  const common = {
    id,
    x: shape === "circle" ? startWorld.x : centerX,
    y: shape === "circle" ? startWorld.y : centerY,
    shape,
    label: isElectric ? "Electric Field" : "Magnetic Field",
    color: isElectric ? "rgba(59, 130, 246, 0.55)" : "rgba(34, 197, 94, 0.55)"
  } as const;

  if (shape === "rect") {
    const width = Math.max(120, Math.abs(dx));
    const height = Math.max(120, Math.abs(dy));
    if (isElectric) {
      return {
        ...common,
        kind: "electric",
        width,
        height,
        magnitude: 1,
        directionRad: 0
      };
    }
    return { ...common, kind: "magnetic", width, height, strength: 1 };
  }

  const radius = Math.max(90, Math.hypot(dx, dy));
  if (isElectric) {
    return {
      ...common,
      kind: "electric",
      radius,
      magnitude: 1,
      directionRad: 0
    };
  }
  return { ...common, kind: "magnetic", radius, strength: 1 };
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  length: number,
  headSize: number
) {
  const mag = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / mag;
  const uy = dirY / mag;
  const x2 = x + ux * length;
  const y2 = y + uy * length;
  const angle = Math.atan2(uy, ux);
  const headAngle = Math.PI / 7;
  const hx1 = x2 - Math.cos(angle - headAngle) * headSize;
  const hy1 = y2 - Math.sin(angle - headAngle) * headSize;
  const hx2 = x2 - Math.cos(angle + headAngle) * headSize;
  const hy2 = y2 - Math.sin(angle + headAngle) * headSize;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.moveTo(x2, y2);
  ctx.lineTo(hx1, hy1);
  ctx.moveTo(x2, y2);
  ctx.lineTo(hx2, hy2);
  ctx.stroke();
}
