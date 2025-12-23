"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import * as Matter from "matter-js";

import { findBodyByMetaId, getBodyMeta } from "@/lib/physics/bodyMeta";
import { getBodyRopeGroup, getConstraintRopeGroup } from "@/lib/physics/bodyShape";
import { createBodyFromSnapshot, snapshotBody, type BodySnapshot } from "@/lib/physics/snapshot";
import type { FieldRegion, HoverReadout, SelectedEntity, ToolId } from "@/lib/physics/types";
import { createId } from "@/lib/utils/id";

type WorldPoint = { x: number; y: number };

type EditorClipboard =
  | { kind: "body"; snapshot: BodySnapshot }
  | { kind: "field"; field: FieldRegion }
  | null;

type EditorAction = { undo: () => void; redo: () => void };

export type SandboxState = {
  engineRef: React.MutableRefObject<Matter.Engine | null>;
  stepRequestedRef: React.MutableRefObject<boolean>;
  isRunning: boolean;
  setIsRunning: (value: boolean) => void;
  gravity: number;
  setGravity: (value: number) => void;
  timeScale: number;
  setTimeScale: (value: number) => void;
  showVelocityVectors: boolean;
  setShowVelocityVectors: (value: boolean) => void;
  showCollisionPoints: boolean;
  setShowCollisionPoints: (value: boolean) => void;
  tool: ToolId;
  setTool: (tool: ToolId) => void;
  fields: FieldRegion[];
  setFields: React.Dispatch<React.SetStateAction<FieldRegion[]>>;
  selected: SelectedEntity;
  setSelected: (sel: SelectedEntity) => void;
  hoveredBodyId: string | null;
  setHoveredBodyId: (id: string | null) => void;
  hoverReadout: HoverReadout | null;
  setHoverReadout: (r: HoverReadout | null) => void;
  pointerWorldRef: React.MutableRefObject<WorldPoint | null>;
  requestStep: () => void;
  requestReset: () => void;
  resetNonce: number;
  deleteSelected: () => void;
  deleteFieldById: (fieldId: string) => void;
  copySelected: () => void;
  paste: () => void;
  duplicateSelected: () => void;
  undo: () => void;
  redo: () => void;
  commitWorldAdd: (payload: {
    bodies?: Matter.Body[];
    constraints?: Matter.Constraint[];
    selectionBefore?: SelectedEntity;
    selectionAfter: SelectedEntity;
  }) => void;
  commitFieldAdd: (payload: { field: FieldRegion; selectionBefore?: SelectedEntity; selectionAfter: SelectedEntity }) => void;
};

const SandboxContext = createContext<SandboxState | null>(null);

export function SandboxProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<Matter.Engine | null>(null);
  const stepRequestedRef = useRef(false);
  const pointerWorldRef = useRef<WorldPoint | null>(null);
  const clipboardRef = useRef<EditorClipboard>(null);
  const undoStackRef = useRef<EditorAction[]>([]);
  const redoStackRef = useRef<EditorAction[]>([]);

  const [isRunning, setIsRunning] = useState(true);
  const [gravity, setGravity] = useState(9.8);
  const [timeScale, setTimeScale] = useState(1);
  const [showVelocityVectors, setShowVelocityVectors] = useState(false);
  const [showCollisionPoints, setShowCollisionPoints] = useState(true);
  const [tool, setTool] = useState<ToolId>("select");
  const [fields, setFields] = useState<FieldRegion[]>([]);
  const [selected, setSelected] = useState<SelectedEntity>({ kind: "none" });
  const [hoveredBodyId, setHoveredBodyId] = useState<string | null>(null);
  const [hoverReadout, setHoverReadout] = useState<HoverReadout | null>(null);
  const [resetNonce, setResetNonce] = useState(0);

  const pushHistory = useCallback((action: EditorAction) => {
    undoStackRef.current.push(action);
    if (undoStackRef.current.length > 200) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, []);

  const undo = useCallback(() => {
    const action = undoStackRef.current.pop();
    if (!action) return;
    action.undo();
    redoStackRef.current.push(action);
  }, []);

  const redo = useCallback(() => {
    const action = redoStackRef.current.pop();
    if (!action) return;
    action.redo();
    undoStackRef.current.push(action);
  }, []);

  const clearHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, []);

  const removeWorldObjects = useCallback((bodies: Matter.Body[], constraints: Matter.Constraint[]) => {
    const engine = engineRef.current;
    if (!engine) return;
    for (const c of constraints) Matter.World.remove(engine.world, c);
    for (const b of bodies) Matter.World.remove(engine.world, b);
  }, []);

  const addWorldObjects = useCallback((bodies: Matter.Body[], constraints: Matter.Constraint[]) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (bodies.length) Matter.World.add(engine.world, bodies);
    if (constraints.length) Matter.World.add(engine.world, constraints);
  }, []);

  const commitWorldAdd = useCallback(
    (payload: { bodies?: Matter.Body[]; constraints?: Matter.Constraint[]; selectionBefore?: SelectedEntity; selectionAfter: SelectedEntity }) => {
      const bodies = payload.bodies ?? [];
      const constraints = payload.constraints ?? [];
      const before = payload.selectionBefore ?? selected;
      const after = payload.selectionAfter;

      const action: EditorAction = {
        redo: () => {
          addWorldObjects(bodies, constraints);
          setSelected(after);
        },
        undo: () => {
          removeWorldObjects(bodies, constraints);
          setSelected(before);
          setHoveredBodyId(null);
          setHoverReadout(null);
        }
      };

      action.redo();
      pushHistory(action);
    },
    [addWorldObjects, pushHistory, removeWorldObjects, selected]
  );

  const commitFieldAdd = useCallback(
    (payload: { field: FieldRegion; selectionBefore?: SelectedEntity; selectionAfter: SelectedEntity }) => {
      const before = payload.selectionBefore ?? selected;
      const after = payload.selectionAfter;
      const field = payload.field;

      const action: EditorAction = {
        redo: () => {
          setFields((prev) => [...prev, field]);
          setSelected(after);
        },
        undo: () => {
          setFields((prev) => prev.filter((f) => f.id !== field.id));
          setSelected(before);
        }
      };

      action.redo();
      pushHistory(action);
    },
    [pushHistory, selected]
  );

  const deleteFieldById = useCallback(
    (fieldId: string) => {
      const idx = fields.findIndex((f) => f.id === fieldId);
      if (idx < 0) return;
      const field = fields[idx]!;
      const before = selected;
      const after: SelectedEntity = { kind: "none" };

      const action: EditorAction = {
        redo: () => {
          setFields((prev) => prev.filter((f) => f.id !== fieldId));
          setSelected(after);
        },
        undo: () => {
          setFields((prev) => {
            const next = [...prev];
            next.splice(Math.min(idx, next.length), 0, field);
            return next;
          });
          setSelected(before);
        }
      };

      action.redo();
      pushHistory(action);
    },
    [fields, pushHistory, selected]
  );

  const deleteSelected = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (selected.kind === "field") {
      deleteFieldById(selected.id);
      return;
    }

    if (selected.kind !== "body") return;

    const body = findBodyByMetaId(engine, selected.id);
    if (!body) {
      setSelected({ kind: "none" });
      return;
    }

    const allBodies = Matter.Composite.allBodies(engine.world);
    const allConstraints = Matter.Composite.allConstraints(engine.world);
    const bodiesToRemove = new Set<Matter.Body>([body]);
    const constraintsToRemove = new Set<Matter.Constraint>();
    const ropeGroups = new Set<string>();

    const directBodyRope = getBodyRopeGroup(body);
    if (directBodyRope) ropeGroups.add(directBodyRope);

    for (const c of allConstraints) {
      if (c.bodyA?.id === body.id || c.bodyB?.id === body.id) {
        constraintsToRemove.add(c);
        const rg = getConstraintRopeGroup(c);
        if (rg) ropeGroups.add(rg);
      }
    }

    if (ropeGroups.size > 0) {
      for (const b of allBodies) {
        const rg = getBodyRopeGroup(b);
        if (rg && ropeGroups.has(rg)) bodiesToRemove.add(b);
      }
      for (const c of allConstraints) {
        const rg = getConstraintRopeGroup(c);
        if (rg && ropeGroups.has(rg)) constraintsToRemove.add(c);
      }
    }

    const bodies = Array.from(bodiesToRemove);
    const constraints = Array.from(constraintsToRemove);
    const before = selected;
    const after: SelectedEntity = { kind: "none" };

    const action: EditorAction = {
      redo: () => {
        removeWorldObjects(bodies, constraints);
        setSelected(after);
        setHoveredBodyId(null);
        setHoverReadout(null);
      },
      undo: () => {
        addWorldObjects(bodies, constraints);
        setSelected(before);
      }
    };

    action.redo();
    pushHistory(action);
  }, [addWorldObjects, deleteFieldById, pushHistory, removeWorldObjects, selected]);

  const copySelected = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (selected.kind === "body") {
      const body = findBodyByMetaId(engine, selected.id);
      if (!body) return;
      const snap = snapshotBody(body);
      if (!snap) return;
      clipboardRef.current = { kind: "body", snapshot: snap };
      return;
    }

    if (selected.kind === "field") {
      const field = fields.find((f) => f.id === selected.id);
      if (!field) return;
      clipboardRef.current = { kind: "field", field: { ...field } as FieldRegion };
    }
  }, [fields, selected]);

  const paste = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const clip = clipboardRef.current;
    if (!clip) return;

    const before = selected;
    const cursor = pointerWorldRef.current;
    const defaultOffset = { x: 48, y: 48 };

    if (clip.kind === "body") {
      const body = createBodyFromSnapshot(clip.snapshot, {
        position: cursor ? { x: cursor.x + 18, y: cursor.y + 18 } : undefined,
        offset: cursor ? undefined : defaultOffset
      });
      const meta = getBodyMeta(body) ?? null;
      if (!meta) return;
      commitWorldAdd({ bodies: [body], selectionBefore: before, selectionAfter: { kind: "body", id: meta.id } });
      return;
    }

    const field = clip.field;
    const id = createId("field");
    const next: FieldRegion = {
      ...field,
      id,
      x: cursor ? cursor.x : field.x + defaultOffset.x,
      y: cursor ? cursor.y : field.y + defaultOffset.y
    } as FieldRegion;
    commitFieldAdd({ field: next, selectionBefore: before, selectionAfter: { kind: "field", id } });
  }, [commitFieldAdd, commitWorldAdd, selected]);

  const duplicateSelected = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (selected.kind === "body") {
      const body = findBodyByMetaId(engine, selected.id);
      if (!body) return;
      const snap = snapshotBody(body);
      if (!snap) return;
      const clone = createBodyFromSnapshot(snap, { offset: { x: 48, y: 48 } });
      const meta = getBodyMeta(clone) ?? null;
      if (!meta) return;
      commitWorldAdd({ bodies: [clone], selectionBefore: selected, selectionAfter: { kind: "body", id: meta.id } });
      return;
    }

    if (selected.kind === "field") {
      const field = fields.find((f) => f.id === selected.id);
      if (!field) return;
      const id = createId("field");
      const next: FieldRegion = { ...field, id, x: field.x + 48, y: field.y + 48 } as FieldRegion;
      commitFieldAdd({ field: next, selectionBefore: selected, selectionAfter: { kind: "field", id } });
    }
  }, [commitFieldAdd, commitWorldAdd, fields, selected]);

  const requestStep = useCallback(() => {
    stepRequestedRef.current = true;
  }, []);

  const requestReset = useCallback(() => {
    stepRequestedRef.current = false;
    setSelected({ kind: "none" });
    setHoveredBodyId(null);
    setHoverReadout(null);
    setFields([]);
    clipboardRef.current = null;
    clearHistory();
    setResetNonce((v) => v + 1);
  }, [clearHistory]);

  const value = useMemo<SandboxState>(
    () => ({
      engineRef,
      stepRequestedRef,
      isRunning,
      setIsRunning,
      gravity,
      setGravity,
      timeScale,
      setTimeScale,
      showVelocityVectors,
      setShowVelocityVectors,
      showCollisionPoints,
      setShowCollisionPoints,
      tool,
      setTool,
      fields,
      setFields,
      selected,
      setSelected,
      hoveredBodyId,
      setHoveredBodyId,
      hoverReadout,
      setHoverReadout,
      pointerWorldRef,
      requestStep,
      requestReset,
      resetNonce,
      deleteSelected,
      deleteFieldById,
      copySelected,
      paste,
      duplicateSelected,
      undo,
      redo,
      commitWorldAdd,
      commitFieldAdd
    }),
    [
      commitFieldAdd,
      commitWorldAdd,
      copySelected,
      deleteFieldById,
      deleteSelected,
      duplicateSelected,
      fields,
      gravity,
      hoverReadout,
      hoveredBodyId,
      isRunning,
      paste,
      requestReset,
      requestStep,
      resetNonce,
      redo,
      selected,
      showCollisionPoints,
      showVelocityVectors,
      timeScale,
      tool,
      undo
    ]
  );

  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

export function useSandbox() {
  const ctx = useContext(SandboxContext);
  if (!ctx) throw new Error("useSandbox must be used within SandboxProvider");
  return ctx;
}
