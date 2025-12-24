"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as Matter from "matter-js";

import { useSandbox } from "@/components/sandbox/SandboxContext";
import { ensureBodyMeta, findBodyByMetaId, getBodyMeta } from "@/lib/physics/bodyMeta";
import { setBodyRopeGroup, setBodyShape, setConstraintRopeGroup } from "@/lib/physics/bodyShape";
import { applyConveyorBelts, ensureConveyorMeta, getConveyorMeta } from "@/lib/physics/conveyor";
import { applyElectromagnetism } from "@/lib/physics/em";
import { isPointInField } from "@/lib/physics/fields";
import type { FieldRegion, ToolId } from "@/lib/physics/types";
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

type Interaction =
  | { kind: "none" }
  | { kind: "pan"; pointerId: number; startX: number; startY: number; startCameraX: number; startCameraY: number }
  | { kind: "draw"; pointerId: number; tool: ToolId; startWorld: WorldPoint; currentWorld: WorldPoint }
  | { kind: "drag"; pointerId: number; dragConstraint: Matter.Constraint }
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
    showCollisionPoints,
    showVelocityVectors,
    fields,
    selected,
    hoveredBodyId,
    pointerWorldRef,
    commitWorldAdd,
    commitFieldAdd,
    setSelected,
    setHoveredBodyId,
    setHoverReadout
  } = useSandbox();

  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const collisionsRef = useRef<CollisionMark[]>([]);
  const interactionRef = useRef<Interaction>({ kind: "none" });
  const lastPointerWorldRef = useRef<WorldPoint | null>(null);
  const fieldsRef = useRef<FieldRegion[]>(fields);
  const selectedRef = useRef(selected);
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
    hoveredBodyIdRef.current = hoveredBodyId;
  }, [hoveredBodyId]);

  const screenToWorld = useMemo(() => {
    return (screenX: number, screenY: number, rect: DOMRect) => {
      const camera = cameraRef.current;
      const x = (screenX - rect.width / 2) / camera.zoom + camera.x;
      const y = (screenY - rect.height / 2) / camera.zoom + camera.y;
      return { x, y };
    };
  }, []);

  const settingsRef = useRef({
    isRunning,
    timeScale,
    gravity,
    tool,
    showCollisionPoints,
    showVelocityVectors
  });

  useEffect(() => {
    settingsRef.current = { isRunning, timeScale, gravity, tool, showCollisionPoints, showVelocityVectors };
  }, [gravity, isRunning, showCollisionPoints, showVelocityVectors, timeScale, tool]);

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
        applyElectromagnetism(engine, fieldsRef.current);
        applyConveyorBelts(engine);
        Matter.Engine.update(engine, stepDt);
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
              const v = Math.hypot(body.velocity.x, body.velocity.y);
              const ke = 0.5 * body.mass * v * v;
              setHoverReadout({
                screenX: pointerScreen.x,
                screenY: pointerScreen.y,
                velocity: v,
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
      const hoveredId = hoveredBodyIdRef.current;
      for (const field of fieldsRef.current) {
        const isSelected = selectedFieldId === field.id;
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
      for (const body of bodies) {
        const meta = getBodyMeta(body);
        const isCharged = Boolean(meta?.isCharged && meta.charge !== 0);
        const isStatic = body.isStatic;
        const conveyor = getConveyorMeta(body);
        const isConveyor = Boolean(conveyor?.enabled);
        const id = meta?.id ?? null;
        const isSelected = Boolean(selectedBodyId && id === selectedBodyId);
        const isHovered = Boolean(hoveredId && id === hoveredId);

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
          ctx.lineWidth = (isSelected ? 2.75 : 2) / camera.zoom;
          ctx.strokeStyle = isSelected ? "rgba(59, 130, 246, 0.9)" : "rgba(148, 163, 184, 0.7)";
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
              startWorld: world,
              currentWorld: world
            };
            canvas.setPointerCapture(e.pointerId);
            return;
          }

          if (tool === "rod" || tool === "spring" || tool === "rope") {
            const body = queryBodyAtPoint(engine, world);
            if (!body) return;

            const meta = ensureBodyMeta(body, { label: body.label || "Body" });
            setSelected({ kind: "body", id: meta.id });

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
            const field = queryFieldAtPoint(fieldsRef.current, world);
            if (field) {
              setSelected({ kind: "field", id: field.id });
              return;
            }

            const body = queryBodyAtPoint(engine, world);
            if (!body) {
              setSelected({ kind: "none" });
              return;
            }

            const meta = ensureBodyMeta(body, { label: body.label || "Body" });
            setSelected({ kind: "body", id: meta.id });

            const drag = Matter.Constraint.create({
              pointA: { x: world.x, y: world.y },
              bodyB: body,
              pointB: { x: body.position.x - world.x, y: body.position.y - world.y },
              stiffness: 0.15,
              damping: 0.08
            });
            Matter.World.add(engine.world, drag);
            interactionRef.current = { kind: "drag", pointerId: e.pointerId, dragConstraint: drag };
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
          if (interaction.kind === "draw" && interaction.pointerId === e.pointerId) {
            interactionRef.current = { ...interaction, currentWorld: world };
            return;
          }
          if (interaction.kind === "drag" && interaction.pointerId === e.pointerId) {
            interaction.dragConstraint.pointA = world;
            return;
          }
          if (interaction.kind === "constraint" && interaction.pointerId === e.pointerId) {
            return;
          }

          const body = queryBodyAtPoint(engine, world);
          if (!body) {
            setHoveredBodyId(null);
            setHoverReadout(null);
            return;
          }
          const meta = ensureBodyMeta(body, { label: body.label || "Body" });
          const v = Math.hypot(body.velocity.x, body.velocity.y);
          const ke = 0.5 * body.mass * v * v;
          setHoveredBodyId(meta.id);
          setHoverReadout({ screenX: x, screenY: y, velocity: v, kineticEnergy: ke });
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
              const dist = Math.hypot(world.x - startBody.position.x, world.y - startBody.position.y);
              if (dist > 24) {
                if (interaction.tool === "rope") {
                  const rope = addRopeChainToPoint(startBody, world);
                  commitWorldAdd({
                    bodies: rope.bodies,
                    constraints: rope.constraints,
                    selectionBefore,
                    selectionAfter: { kind: "body", id: startId }
                  });
                } else {
                  const constraint = createConstraintToPoint(interaction.tool, startBody, world);
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
          if (interaction.kind === "drag" && interaction.pointerId === e.pointerId) {
            Matter.World.remove(engine.world, interaction.dragConstraint);
            interactionRef.current = { kind: "none" };
            canvas.releasePointerCapture(e.pointerId);
            return;
          }
          if (interaction.kind === "draw" && interaction.pointerId === e.pointerId) {
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
      frictionStatic: 0.4
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
      frictionStatic: 0.4
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
    frictionStatic: 0.5
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
