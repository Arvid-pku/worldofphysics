"use client";

import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import type * as Matter from "matter-js";

import type { FieldRegion, HoverReadout, SelectedEntity, ToolId } from "@/lib/physics/types";

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
  requestStep: () => void;
  requestReset: () => void;
  resetNonce: number;
};

const SandboxContext = createContext<SandboxState | null>(null);

export function SandboxProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<Matter.Engine | null>(null);
  const stepRequestedRef = useRef(false);

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

  const requestStep = () => {
    stepRequestedRef.current = true;
  };

  const requestReset = () => {
    stepRequestedRef.current = false;
    setSelected({ kind: "none" });
    setHoveredBodyId(null);
    setHoverReadout(null);
    setFields([]);
    setResetNonce((v) => v + 1);
  };

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
      requestStep,
      requestReset,
      resetNonce
    }),
    [
      fields,
      gravity,
      hoverReadout,
      hoveredBodyId,
      isRunning,
      resetNonce,
      selected,
      showCollisionPoints,
      showVelocityVectors,
      timeScale,
      tool
    ]
  );

  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

export function useSandbox() {
  const ctx = useContext(SandboxContext);
  if (!ctx) throw new Error("useSandbox must be used within SandboxProvider");
  return ctx;
}

