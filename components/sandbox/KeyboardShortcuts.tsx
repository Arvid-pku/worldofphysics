"use client";

import { useEffect } from "react";

import { useSandbox } from "@/components/sandbox/SandboxContext";
import type { ToolId } from "@/lib/physics/types";

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

const TOOL_BINDINGS: Record<string, ToolId> = {
  v: "select",
  h: "pan",
  c: "circle",
  r: "rectangle",
  p: "polygon",
  l: "velocity",
  m: "ruler"
};

export function KeyboardShortcuts() {
  const {
    selected,
    deleteSelected,
    copySelected,
    paste,
    duplicateSelected,
    undo,
    redo,
    isRunning,
    setIsRunning,
    requestStep,
    requestReset,
    setShowShortcuts,
    setShowLabs,
    setTool,
    rightPanelTab,
    setRightPanelTab
  } = useSandbox();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (isEditableTarget(e.target)) return;

      // Edit
      if ((e.key === "Delete" || e.key === "Backspace") && selected.kind !== "none") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (mod && key === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && key === "v") {
        e.preventDefault();
        paste();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // Modal toggles
      if (key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // Transport — without modifiers
      if (!mod) {
        if (e.key === " ") {
          e.preventDefault();
          setIsRunning(!isRunning);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          requestStep();
          return;
        }
        if (key === "r" && e.shiftKey) {
          e.preventDefault();
          requestReset();
          return;
        }

        // Right-panel tab toggles
        if (key === "i" && !e.shiftKey) {
          e.preventDefault();
          setRightPanelTab(rightPanelTab === "inspector" ? "inspector" : "inspector");
          setRightPanelTab("inspector");
          return;
        }
        if (key === "g" && !e.shiftKey) {
          e.preventDefault();
          setRightPanelTab("graphs");
          return;
        }
        if (key === "f" && !e.shiftKey) {
          e.preventDefault();
          setRightPanelTab("fbd");
          return;
        }

        // Tool bindings (single key, no modifier)
        const tool = TOOL_BINDINGS[key];
        if (tool && !e.shiftKey) {
          // 'L' is also Labs shortcut. Prefer Labs when shift is held? Currently treat
          // single 'l' as velocity tool. To open Labs use sidebar/topbar button.
          // To avoid clash, we do NOT bind 'l' to labs here.
          e.preventDefault();
          setTool(tool);
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    copySelected,
    deleteSelected,
    duplicateSelected,
    isRunning,
    paste,
    redo,
    rightPanelTab,
    selected.kind,
    setIsRunning,
    setRightPanelTab,
    setShowLabs,
    setShowShortcuts,
    setTool,
    requestReset,
    requestStep,
    undo
  ]);

  return null;
}
