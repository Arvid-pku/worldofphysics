"use client";

import { useEffect } from "react";

import { useSandbox } from "@/components/sandbox/SandboxContext";

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts() {
  const { selected, deleteSelected, copySelected, paste, duplicateSelected, undo, redo } = useSandbox();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (isEditableTarget(e.target)) return;

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
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copySelected, deleteSelected, duplicateSelected, paste, redo, selected.kind, undo]);

  return null;
}

