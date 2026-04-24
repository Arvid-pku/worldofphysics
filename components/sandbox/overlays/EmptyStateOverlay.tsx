"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Circle, Sparkles } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { SCENE_MODULES } from "@/lib/library/modules";

export function EmptyStateOverlay() {
  const { t } = useI18n();
  const { setShowLabs, setTool, engineRef, resetNonce } = useSandbox();
  const [bodyCount, setBodyCount] = useState(0);

  // Poll the engine periodically so the overlay reactively appears/disappears
  // as the user adds or deletes bodies. ~4Hz is plenty for an empty-state cue.
  useEffect(() => {
    let cancelled = false;
    function tick() {
      if (cancelled) return;
      const engine = engineRef.current;
      const count = engine?.world?.bodies?.length ?? 0;
      setBodyCount(count);
    }
    tick();
    const id = window.setInterval(tick, 250);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [engineRef, resetNonce]);

  if (bodyCount > 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-6">
      <div className="pointer-events-auto animate-fade-up flex w-[460px] max-w-full flex-col items-center text-center">
        <div
          aria-hidden
          className="relative mb-5 grid h-14 w-14 place-items-center"
        >
          <span className="absolute inset-0 rounded-full bg-spark-500/15 blur-xl" />
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-spark-400/40 to-plasma-500/40 ring-1 ring-spark-400/40" />
          <Sparkles className="relative h-6 w-6 text-spark-200" />
        </div>
        <h2 className="font-display text-[22px] font-semibold leading-tight text-white text-balance">
          {t("empty.heading")}
        </h2>
        <p className="mt-2 max-w-[400px] text-[13px] leading-relaxed text-mute text-balance">
          {t("empty.body")}
        </p>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTool("circle")}
            className="btn-ghost flex h-10 items-center gap-2 rounded-full px-4 text-[12.5px] font-medium"
          >
            <Circle className="h-3.5 w-3.5" />
            {t("tool.circle")}
            <span className="kbd ml-1">C</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLabs(true)}
            className="btn-primary flex h-10 items-center gap-2 rounded-full px-4 text-[12.5px] font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("empty.cta.lab")}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Quick scene modules hint */}
        <div className="mt-7 grid w-full grid-cols-3 gap-2">
          {SCENE_MODULES.map((m) => (
            <div
              key={m.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-wop-module", m.id);
                e.dataTransfer.setData("text/plain", m.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="surface group cursor-grab rounded-xl p-3 text-left transition hover:ring-1 hover:ring-violet2-400/40 active:cursor-grabbing"
              title="Drag onto the canvas"
            >
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
                <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-violet2-400" />
                {t(m.titleKey)}
              </div>
              <div className="mt-0.5 text-[10.5px] leading-snug text-mute-2">
                {t(m.subtitleKey)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-mute-2">
          Drag a quick scene onto the canvas, or pick a tool from the sidebar.
        </div>
      </div>
    </div>
  );
}
