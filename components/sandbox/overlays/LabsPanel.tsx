"use client";

import { BookOpen, Play, RotateCcw, X } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { LABS } from "@/lib/labs/labs";
import { cn } from "@/lib/utils/cn";

export function LabsPanel() {
  const { t } = useI18n();
  const {
    showLabs,
    setShowLabs,
    activeLabId,
    setActiveLabId,
    labStepIndex,
    setLabStepIndex,
    startLab,
    restartLab,
    nextLabStep,
    prevLabStep
  } = useSandbox();

  const active = (activeLabId ? (LABS.find((l) => l.id === activeLabId) ?? null) : null) ?? LABS[0]!;

  // Modal: choose a lab + start.
  const modal = showLabs ? (
    <div className="pointer-events-auto fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLabs(false)} />

      <div className="absolute left-1/2 top-1/2 w-[920px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/60 shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-800/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-100">{t("labs.title")}</div>
              <div className="mt-0.5 text-xs text-slate-500">{t("labs.subtitle")}</div>
            </div>
          </div>
          <button
            type="button"
            title={t("labs.close")}
            onClick={() => setShowLabs(false)}
            className="grid h-10 w-10 place-items-center rounded-md border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-[320px_1fr]">
          <aside className="border-r border-slate-800/70 bg-slate-950/40 p-3">
            <div className="space-y-2">
              {LABS.map((lab) => {
                const isActive = lab.id === active.id;
                return (
                  <button
                    key={lab.id}
                    type="button"
                    onClick={() => {
                      setActiveLabId(lab.id);
                      setLabStepIndex(0);
                    }}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition",
                      isActive
                        ? "border-blue-500/30 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]"
                        : "border-slate-800/70 bg-slate-950/30 hover:bg-slate-900/40"
                    )}
                  >
                    <div className="text-sm font-semibold text-slate-100">{t(lab.titleKey as any)}</div>
                    <div className="mt-1 text-xs text-slate-500">{t(lab.subtitleKey as any)}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-100">{t(active.titleKey as any)}</div>
                <div className="mt-1 text-sm text-slate-400">{t(active.subtitleKey as any)}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  startLab(active.id);
                  setShowLabs(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-blue-500/15"
              >
                <Play className="h-4 w-4" />
                {t("labs.start")}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800/70 bg-slate-950/35 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{t("labs.steps")}</div>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-200">
                {active.stepsKeys.map((k) => (
                  <li key={k} className="leading-relaxed text-slate-200">
                    {t(k as any)}
                  </li>
                ))}
              </ol>
            </div>
          </main>
        </div>
      </div>
    </div>
  ) : null;

  // Guide overlay while a lab is active.
  const guide = activeLabId ? (
    <div className="pointer-events-none absolute left-4 top-28 z-30 w-[380px] max-w-[calc(100vw-2rem)]">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/40 shadow-xl backdrop-blur">
        <header className="flex items-start justify-between gap-2 border-b border-slate-800/70 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">{t(active.titleKey as any)}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {t("labs.stepLabel")} {Math.min(active.stepsKeys.length, labStepIndex + 1)}/{active.stepsKeys.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title={t("labs.open")}
              onClick={() => setShowLabs(true)}
              className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/50"
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              title={t("labs.restart")}
              onClick={restartLab}
              className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/50"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              title={t("labs.close")}
              onClick={() => {
                setActiveLabId(null);
              }}
              className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="px-4 py-4">
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3 text-sm text-slate-200">
            {t(active.stepsKeys[Math.min(active.stepsKeys.length - 1, labStepIndex)] as any)}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={prevLabStep}
              className="h-9 flex-1 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-200 hover:bg-slate-900/50"
            >
              {t("labs.prev")}
            </button>
            <button
              type="button"
              onClick={() => nextLabStep(active.stepsKeys.length)}
              className="h-9 flex-1 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-200 hover:bg-slate-900/50"
            >
              {t("labs.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {modal}
      {guide}
    </>
  );
}
