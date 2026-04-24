"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";

type Side = "top" | "bottom" | "left" | "right";

export function Tooltip({
  label,
  hint,
  shortcut,
  side = "right",
  delay = 250,
  className,
  children
}: {
  label: string;
  hint?: string;
  shortcut?: string | string[];
  side?: Side;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  function show() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 8;
      let top = rect.top + rect.height / 2;
      let left = rect.right + gap;
      if (side === "left") left = rect.left - gap;
      if (side === "top") {
        top = rect.top - gap;
        left = rect.left + rect.width / 2;
      }
      if (side === "bottom") {
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2;
      }
      setCoords({ top, left });
      setVisible(true);
    }, delay);
  }
  function hide() {
    if (timer.current) window.clearTimeout(timer.current);
    setVisible(false);
  }

  const shortcuts = Array.isArray(shortcut) ? shortcut : shortcut ? [shortcut] : [];

  const transform =
    side === "right"
      ? "translate(0, -50%)"
      : side === "left"
        ? "translate(-100%, -50%)"
        : side === "top"
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)";

  return (
    <span
      ref={wrapRef}
      onPointerEnter={show}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={show}
      onBlur={hide}
      className={cn("contents", className)}
    >
      {children}
      {visible && coords ? (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[1000] animate-fade-in"
          style={{ top: coords.top, left: coords.left, transform }}
        >
          <span className="glass-strong flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-white shadow-floating">
            <span className="whitespace-nowrap">{label}</span>
            {hint ? <span className="text-mute">{hint}</span> : null}
            {shortcuts.length > 0 ? (
              <span className="ml-1 flex items-center gap-1">
                {shortcuts.map((s, i) => (
                  <span key={i} className="kbd">
                    {s}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
        </span>
      ) : null}
    </span>
  );
}
