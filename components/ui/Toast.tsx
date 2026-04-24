"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type ToastTone = "info" | "success" | "warning" | "danger";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  durationMs: number;
};

type ToastContextType = {
  push: (toast: Omit<Toast, "id" | "durationMs"> & { durationMs?: number }) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => "",
      dismiss: () => {}
    } as ToastContextType;
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<ToastContextType["push"]>(
    ({ title, description, tone, durationMs }) => {
      counter.current += 1;
      const id = `t_${Date.now()}_${counter.current}`;
      const t: Toast = {
        id,
        title,
        description,
        tone,
        durationMs: durationMs ?? 2400
      };
      setToasts((prev) => [...prev.slice(-3), t]);
      window.setTimeout(() => dismiss(id), t.durationMs);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  dismiss
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[2000] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(true);
  }, []);

  const Icon =
    toast.tone === "success"
      ? CheckCircle2
      : toast.tone === "warning"
        ? AlertTriangle
        : toast.tone === "danger"
          ? XCircle
          : Info;

  const accent =
    toast.tone === "success"
      ? "text-ok-400 bg-ok-500/10 ring-ok-400/30"
      : toast.tone === "warning"
        ? "text-ember-300 bg-ember-500/10 ring-ember-400/30"
        : toast.tone === "danger"
          ? "text-bad-400 bg-bad-500/10 ring-bad-400/30"
          : "text-spark-200 bg-spark-500/10 ring-spark-400/30";

  return (
    <div
      className={cn(
        "glass-strong pointer-events-auto flex items-start gap-3 rounded-xl p-3 shadow-floating",
        open ? "animate-toast-in" : ""
      )}
    >
      <div className={cn("grid h-8 w-8 place-items-center rounded-lg ring-1", accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-sm font-semibold text-white">{toast.title}</div>
        {toast.description ? (
          <div className="mt-0.5 text-[11.5px] leading-snug text-mute">{toast.description}</div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="grid h-6 w-6 place-items-center rounded-md text-mute hover:bg-white/[0.06] hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
