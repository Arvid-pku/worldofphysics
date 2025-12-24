"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import * as Matter from "matter-js";

import { findBodyByMetaId, getBodyMeta } from "@/lib/physics/bodyMeta";
import { applyBodyState, type ApplyBodyStateOptions, type BodyState } from "@/lib/physics/bodyState";
import { getBodyRopeGroup, getConstraintRopeGroup } from "@/lib/physics/bodyShape";
import { createBodyFromSnapshot, snapshotBody, type BodySnapshot } from "@/lib/physics/snapshot";
import type { FieldRegion, HoverReadout, SelectedEntity, ToolId } from "@/lib/physics/types";
import { createId } from "@/lib/utils/id";

type WorldPoint = { x: number; y: number };

type EditorClipboard =
  | { kind: "body"; snapshot: BodySnapshot }
  | { kind: "bodies"; snapshots: BodySnapshot[] }
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
  showTrails: boolean;
  setShowTrails: (value: boolean) => void;
  showGraphs: boolean;
  setShowGraphs: (value: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (value: boolean) => void;
  snapStepMeters: number;
  setSnapStepMeters: (value: number) => void;
  tool: ToolId;
  setTool: (tool: ToolId) => void;
  fields: FieldRegion[];
  setFields: React.Dispatch<React.SetStateAction<FieldRegion[]>>;
  selected: SelectedEntity;
  selectedBodyIds: string[];
  selectBody: (bodyId: string, opts?: { additive?: boolean; toggle?: boolean }) => void;
  setSelectedBodies: (bodyIds: string[], opts?: { primaryId?: string | null }) => void;
  selectField: (fieldId: string) => void;
  clearSelection: () => void;
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
  commitBodyStateChange: (payload: { bodyId: string; before: BodyState; after: BodyState; apply?: ApplyBodyStateOptions }) => void;
  commitFieldChange: (payload: { fieldId: string; before: FieldRegion; after: FieldRegion }) => void;
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
  const [showTrails, setShowTrails] = useState(false);
  const [showGraphs, setShowGraphs] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [snapStepMeters, setSnapStepMeters] = useState(0.25);
  const [tool, setTool] = useState<ToolId>("select");
  const [fields, setFields] = useState<FieldRegion[]>([]);
  const [selected, setSelected] = useState<SelectedEntity>({ kind: "none" });
  const [selectedBodyIds, setSelectedBodyIds] = useState<string[]>([]);
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
          setSelectedBodyIds(after.kind === "body" ? [after.id] : []);
        },
        undo: () => {
          removeWorldObjects(bodies, constraints);
          setSelected(before);
          setSelectedBodyIds(before.kind === "body" ? [before.id] : []);
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
          setSelectedBodyIds([]);
        },
        undo: () => {
          setFields((prev) => prev.filter((f) => f.id !== field.id));
          setSelected(before);
          setSelectedBodyIds(before.kind === "body" ? [before.id] : []);
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
          setSelectedBodyIds([]);
        },
        undo: () => {
          setFields((prev) => {
            const next = [...prev];
            next.splice(Math.min(idx, next.length), 0, field);
            return next;
          });
          setSelected(before);
          setSelectedBodyIds(before.kind === "body" ? [before.id] : []);
        }
      };

      action.redo();
      pushHistory(action);
    },
    [fields, pushHistory, selected]
  );

  const selectBody = useCallback(
    (bodyId: string, opts?: { additive?: boolean; toggle?: boolean }) => {
      const additive = Boolean(opts?.additive);
      const toggle = Boolean(opts?.toggle);
      if (!additive) {
        setSelected({ kind: "body", id: bodyId });
        setSelectedBodyIds([bodyId]);
        return;
      }

      setSelectedBodyIds((prev) => {
        const next = new Set(prev);
        if (toggle && next.has(bodyId)) next.delete(bodyId);
        else next.add(bodyId);
        const arr = Array.from(next);
        if (arr.length === 0) {
          setSelected({ kind: "none" });
          return [];
        }
        if (arr.includes(bodyId)) setSelected({ kind: "body", id: bodyId });
        else setSelected({ kind: "body", id: arr[arr.length - 1]! });
        return arr;
      });
    },
    []
  );

  const setSelectedBodies = useCallback((bodyIds: string[], opts?: { primaryId?: string | null }) => {
    const unique = Array.from(new Set(bodyIds));
    const primary = opts?.primaryId ?? unique[unique.length - 1] ?? null;
    setSelectedBodyIds(unique);
    if (!primary) {
      setSelected({ kind: "none" });
      return;
    }
    setSelected({ kind: "body", id: primary });
  }, []);

  const selectField = useCallback((fieldId: string) => {
    setSelected({ kind: "field", id: fieldId });
    setSelectedBodyIds([]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected({ kind: "none" });
    setSelectedBodyIds([]);
    setHoveredBodyId(null);
    setHoverReadout(null);
  }, []);

  const commitBodyStateChange = useCallback(
    (payload: { bodyId: string; before: BodyState; after: BodyState; apply?: ApplyBodyStateOptions }) => {
      const engine = engineRef.current;
      if (!engine) return;
      const { bodyId, before, after, apply } = payload;

      const action: EditorAction = {
        redo: () => {
          const body = findBodyByMetaId(engine, bodyId);
          if (!body) return;
          applyBodyState(body, after, apply);
        },
        undo: () => {
          const body = findBodyByMetaId(engine, bodyId);
          if (!body) return;
          applyBodyState(body, before, apply);
        }
      };

      action.redo();
      pushHistory(action);
    },
    [pushHistory]
  );

  const commitFieldChange = useCallback(
    (payload: { fieldId: string; before: FieldRegion; after: FieldRegion }) => {
      const { fieldId, before, after } = payload;
      const action: EditorAction = {
        redo: () => setFields((prev) => prev.map((f) => (f.id === fieldId ? after : f))),
        undo: () => setFields((prev) => prev.map((f) => (f.id === fieldId ? before : f)))
      };
      action.redo();
      pushHistory(action);
    },
    [pushHistory]
  );

  const deleteSelected = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (selected.kind === "field") {
      deleteFieldById(selected.id);
      return;
    }

    const allBodies = Matter.Composite.allBodies(engine.world);
    const allConstraints = Matter.Composite.allConstraints(engine.world);
    const bodiesToRemove = new Set<Matter.Body>();
    const constraintsToRemove = new Set<Matter.Constraint>();
    const ropeGroups = new Set<string>();

    const baseIds = selectedBodyIds.length > 0 ? selectedBodyIds : selected.kind === "body" ? [selected.id] : [];
    if (baseIds.length === 0) return;

    for (const id of baseIds) {
      const body = findBodyByMetaId(engine, id);
      if (!body) continue;
      bodiesToRemove.add(body);
      const directBodyRope = getBodyRopeGroup(body);
      if (directBodyRope) ropeGroups.add(directBodyRope);
      for (const c of allConstraints) {
        if (c.bodyA?.id === body.id || c.bodyB?.id === body.id) {
          constraintsToRemove.add(c);
          const rg = getConstraintRopeGroup(c);
          if (rg) ropeGroups.add(rg);
        }
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
        setSelectedBodyIds([]);
        setHoveredBodyId(null);
        setHoverReadout(null);
      },
      undo: () => {
        addWorldObjects(bodies, constraints);
        setSelected(before);
        setSelectedBodyIds(before.kind === "body" ? [before.id] : []);
      }
    };

    action.redo();
    pushHistory(action);
  }, [addWorldObjects, deleteFieldById, pushHistory, removeWorldObjects, selected, selectedBodyIds]);

  const copySelected = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (selected.kind === "body" && selectedBodyIds.length > 1) {
      const snaps: BodySnapshot[] = [];
      for (const id of selectedBodyIds) {
        const body = findBodyByMetaId(engine, id);
        if (!body) continue;
        const snap = snapshotBody(body);
        if (!snap) continue;
        snaps.push(snap);
      }
      if (snaps.length > 0) clipboardRef.current = { kind: "bodies", snapshots: snaps };
      return;
    }

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
  }, [fields, selected, selectedBodyIds]);

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

    if (clip.kind === "bodies") {
      const offset = cursor ? { x: cursor.x + 18, y: cursor.y + 18 } : defaultOffset;
      const bodies: Matter.Body[] = [];
      for (const snap of clip.snapshots) {
        const body = createBodyFromSnapshot(snap, { offset });
        bodies.push(body);
      }
      const last = bodies[bodies.length - 1] ?? null;
      const id = last ? getBodyMeta(last)?.id ?? null : null;
      if (!id) return;
      commitWorldAdd({ bodies, selectionBefore: before, selectionAfter: { kind: "body", id } });
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

    if (selected.kind === "body" && selectedBodyIds.length > 1) {
      const snaps: BodySnapshot[] = [];
      for (const id of selectedBodyIds) {
        const body = findBodyByMetaId(engine, id);
        if (!body) continue;
        const snap = snapshotBody(body);
        if (!snap) continue;
        snaps.push(snap);
      }
      if (snaps.length === 0) return;
      const clones = snaps.map((snap) => createBodyFromSnapshot(snap, { offset: { x: 48, y: 48 } }));
      const last = clones[clones.length - 1] ?? null;
      const id = last ? getBodyMeta(last)?.id ?? null : null;
      if (!id) return;
      commitWorldAdd({ bodies: clones, selectionBefore: selected, selectionAfter: { kind: "body", id } });
      return;
    }

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
  }, [commitFieldAdd, commitWorldAdd, fields, selected, selectedBodyIds]);

  const requestStep = useCallback(() => {
    stepRequestedRef.current = true;
  }, []);

  const requestReset = useCallback(() => {
    stepRequestedRef.current = false;
    clearSelection();
    setFields([]);
    clipboardRef.current = null;
    clearHistory();
    setResetNonce((v) => v + 1);
  }, [clearHistory, clearSelection]);

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
      showTrails,
      setShowTrails,
      showGraphs,
      setShowGraphs,
      snapEnabled,
      setSnapEnabled,
      snapStepMeters,
      setSnapStepMeters,
      tool,
      setTool,
      fields,
      setFields,
      selected,
      selectedBodyIds,
      selectBody,
      setSelectedBodies,
      selectField,
      clearSelection,
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
      commitBodyStateChange,
      commitFieldChange,
      commitWorldAdd,
      commitFieldAdd
    }),
    [
      clearSelection,
      commitBodyStateChange,
      commitFieldAdd,
      commitFieldChange,
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
      selectedBodyIds,
      selectBody,
      selectField,
      setSelectedBodies,
      showCollisionPoints,
      showGraphs,
      showTrails,
      showVelocityVectors,
      snapEnabled,
      snapStepMeters,
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
