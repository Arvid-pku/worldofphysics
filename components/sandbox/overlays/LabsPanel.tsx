"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  Compass,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  TriangleRight,
  Waves,
  X
} from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { LABS, type LabId } from "@/lib/labs/labs";
import type { I18nKey } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils/cn";

type Decoration = {
  accent: "spark" | "ember" | "violet" | "plasma" | "ok";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  icon: React.ReactNode;
  illustration: React.ReactNode;
};

const DECOR: Record<LabId, Decoration> = {
  projectile: {
    accent: "spark",
    difficulty: "Beginner",
    icon: <TriangleRight className="h-4 w-4" />,
    illustration: <ProjectileArt />
  },
  pendulum: {
    accent: "plasma",
    difficulty: "Beginner",
    icon: <Waves className="h-4 w-4" />,
    illustration: <PendulumArt />
  },
  atwood: {
    accent: "ember",
    difficulty: "Intermediate",
    icon: <Layers className="h-4 w-4" />,
    illustration: <AtwoodArt />
  },
  charges: {
    accent: "violet",
    difficulty: "Intermediate",
    icon: <Atom className="h-4 w-4" />,
    illustration: <ChargesArt />
  },
  velocity: {
    accent: "ok",
    difficulty: "Beginner",
    icon: <Compass className="h-4 w-4" />,
    illustration: <VelocityArt />
  }
};

function difficultyTone(d: Decoration["difficulty"]) {
  return d === "Advanced"
    ? "ring-bad-500/30 bg-bad-500/10 text-bad-400"
    : d === "Intermediate"
      ? "ring-ember-400/30 bg-ember-500/10 text-ember-300"
      : "ring-ok-400/30 bg-ok-500/10 text-ok-400";
}

function accentRing(a: Decoration["accent"]) {
  return a === "ember"
    ? "ring-ember-400/30 bg-ember-500/10 text-ember-300"
    : a === "violet"
      ? "ring-violet2-400/30 bg-violet2-500/10 text-violet2-400"
      : a === "plasma"
        ? "ring-plasma-400/30 bg-plasma-500/10 text-plasma-300"
        : a === "ok"
          ? "ring-ok-400/30 bg-ok-500/10 text-ok-400"
          : "ring-spark-400/30 bg-spark-500/10 text-spark-200";
}

function accentGlow(a: Decoration["accent"]) {
  return a === "ember"
    ? "from-ember-500/35"
    : a === "violet"
      ? "from-violet2-500/35"
      : a === "plasma"
        ? "from-plasma-500/35"
        : a === "ok"
          ? "from-ok-500/35"
          : "from-spark-500/35";
}

function ProjectileArt() {
  return (
    <svg viewBox="0 0 200 100" className="h-full w-full" fill="none">
      <path
        d="M10 80 Q 70 -10, 190 80"
        stroke="rgba(61,151,255,0.55)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <circle cx="14" cy="78" r="5" fill="#3D97FF" />
      <circle cx="14" cy="78" r="9" fill="rgba(61,151,255,0.18)" />
      <path d="M186 80 L196 90 L196 70 Z" fill="rgba(244,63,94,0.7)" />
      <line x1="0" y1="92" x2="200" y2="92" stroke="rgba(255,255,255,0.10)" />
    </svg>
  );
}
function PendulumArt() {
  return (
    <svg viewBox="0 0 200 100" className="h-full w-full" fill="none">
      <line x1="100" y1="6" x2="100" y2="14" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <circle cx="100" cy="14" r="3" fill="#fff" />
      <path d="M100 18 L60 75" stroke="rgba(60,223,255,0.6)" strokeWidth="1.5" />
      <circle cx="60" cy="75" r="9" fill="#15CDF5" />
      <circle cx="60" cy="75" r="14" fill="rgba(60,223,255,0.18)" />
      <path
        d="M60 75 A 50 50 0 0 1 140 75"
        stroke="rgba(60,223,255,0.30)"
        strokeWidth="1"
        strokeDasharray="3 3"
        fill="none"
      />
    </svg>
  );
}
function AtwoodArt() {
  return (
    <svg viewBox="0 0 200 100" className="h-full w-full" fill="none">
      <circle cx="100" cy="18" r="10" stroke="rgba(255,184,87,0.6)" strokeWidth="1.5" />
      <circle cx="100" cy="18" r="2.5" fill="#FFB857" />
      <line x1="74" y1="22" x2="74" y2="62" stroke="rgba(255,184,87,0.6)" strokeWidth="1.5" />
      <line x1="126" y1="22" x2="126" y2="44" stroke="rgba(255,184,87,0.6)" strokeWidth="1.5" />
      <rect x="62" y="62" width="24" height="20" rx="3" fill="rgba(255,184,87,0.30)" stroke="#FFB857" />
      <rect x="114" y="44" width="24" height="20" rx="3" fill="rgba(255,184,87,0.30)" stroke="#FFB857" />
      <line x1="0" y1="92" x2="200" y2="92" stroke="rgba(255,255,255,0.10)" />
    </svg>
  );
}
function ChargesArt() {
  return (
    <svg viewBox="0 0 200 100" className="h-full w-full" fill="none">
      <circle cx="60" cy="50" r="14" fill="rgba(167,139,250,0.20)" stroke="#A78BFA" />
      <text x="60" y="55" textAnchor="middle" fontSize="14" fill="#A78BFA" fontWeight="700">
        +
      </text>
      <circle cx="140" cy="50" r="14" fill="rgba(244,63,94,0.18)" stroke="#FB7185" />
      <text x="140" y="55" textAnchor="middle" fontSize="14" fill="#FB7185" fontWeight="700">
        −
      </text>
      <path
        d="M76 50 Q 100 30 124 50"
        stroke="rgba(167,139,250,0.6)"
        strokeWidth="1.4"
        strokeDasharray="3 3"
        fill="none"
      />
      <path
        d="M76 50 Q 100 70 124 50"
        stroke="rgba(244,63,94,0.6)"
        strokeWidth="1.4"
        strokeDasharray="3 3"
        fill="none"
      />
    </svg>
  );
}
function VelocityArt() {
  return (
    <svg viewBox="0 0 200 100" className="h-full w-full" fill="none">
      <circle cx="56" cy="58" r="10" fill="#22C55E" />
      <circle cx="56" cy="58" r="16" fill="rgba(34,197,94,0.16)" />
      <line x1="56" y1="58" x2="148" y2="22" stroke="#22C55E" strokeWidth="2" />
      <path d="M148 22 L138 24 L142 32 Z" fill="#22C55E" />
      <line x1="0" y1="92" x2="200" y2="92" stroke="rgba(255,255,255,0.10)" />
      <text
        x="160"
        y="46"
        fontSize="9"
        fill="rgba(34,197,94,0.85)"
        fontWeight="600"
        fontFamily="ui-monospace, monospace"
      >
        v₀
      </text>
    </svg>
  );
}

function LabCard({
  lab,
  decor,
  onStart,
  onPreview
}: {
  lab: (typeof LABS)[number];
  decor: Decoration;
  onStart: () => void;
  onPreview: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPreview}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPreview();
        }
      }}
      className="surface group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl text-left transition hover:ring-1 hover:ring-spark-400/30 hover:translate-y-[-1px]"
    >
      {/* Illustration banner */}
      <div className="relative h-[110px] overflow-hidden border-b border-white/[0.06]">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br to-transparent opacity-90",
            accentGlow(decor.accent)
          )}
        />
        <div className="dot-bg absolute inset-0 opacity-30" />
        <div className="absolute inset-0 grid place-items-center px-6">
          {decor.illustration}
        </div>
        <div
          className={cn(
            "absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
            difficultyTone(decor.difficulty)
          )}
        >
          {decor.difficulty}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <span className={cn("grid h-7 w-7 place-items-center rounded-lg ring-1", accentRing(decor.accent))}>
            {decor.icon}
          </span>
          <div className="font-display text-[14px] font-semibold leading-tight text-white">
            {t(lab.titleKey as I18nKey)}
          </div>
        </div>
        <div className="text-[12px] leading-snug text-mute text-balance">
          {t(lab.subtitleKey as I18nKey)}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-mute-2">
            {lab.stepsKeys.length} {t("labs.steps").toLowerCase()}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className="btn-primary flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold"
          >
            <Play className="h-3.5 w-3.5" />
            {t("labs.start")}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  const [previewId, setPreviewId] = useState<LabId | null>(null);

  // Sync preview id with active lab when modal opens
  useEffect(() => {
    if (showLabs) setPreviewId((p) => p ?? (activeLabId as LabId | null) ?? null);
  }, [showLabs, activeLabId]);

  // Esc to close
  useEffect(() => {
    if (!showLabs) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowLabs(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLabs, setShowLabs]);

  const previewLab = previewId ? LABS.find((l) => l.id === previewId) : null;

  const modal = showLabs ? (
    <div className="fixed inset-0 z-[110] grid place-items-center p-6">
      <div
        aria-hidden
        className="absolute inset-0 animate-fade-in bg-ink-950/80 backdrop-blur-md"
        onClick={() => setShowLabs(false)}
      />
      <div
        role="dialog"
        aria-labelledby="labs-title"
        className="glass-strong animate-scale-in relative flex h-[80vh] max-h-[760px] w-[1080px] max-w-full flex-col overflow-hidden rounded-3xl shadow-floating"
      >
        <header className="flex items-start gap-4 border-b border-white/[0.06] px-6 py-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-spark-500/10 ring-1 ring-spark-400/30 text-spark-200">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 id="labs-title" className="font-display text-[18px] font-semibold text-white">
              {t("labs.title")}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-mute">{t("labs.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowLabs(false)}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full text-mute hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_360px]">
          <div className="scroll-pretty min-h-0 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {LABS.map((lab) => (
                <LabCard
                  key={lab.id}
                  lab={lab}
                  decor={DECOR[lab.id as LabId]}
                  onStart={() => {
                    startLab(lab.id);
                    setShowLabs(false);
                  }}
                  onPreview={() => setPreviewId(lab.id as LabId)}
                />
              ))}
            </div>
          </div>

          {/* Right preview / steps */}
          <aside className="min-h-0 border-t border-white/[0.06] bg-ink-950/60 p-5 lg:border-l lg:border-t-0 scroll-pretty overflow-y-auto">
            {previewLab ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg ring-1",
                      accentRing(DECOR[previewLab.id as LabId].accent)
                    )}
                  >
                    {DECOR[previewLab.id as LabId].icon}
                  </span>
                  <div>
                    <div className="font-display text-[15px] font-semibold text-white">
                      {t(previewLab.titleKey as I18nKey)}
                    </div>
                    <div className="text-[11px] text-mute">
                      {previewLab.stepsKeys.length} {t("labs.steps").toLowerCase()}
                    </div>
                  </div>
                </div>
                <p className="text-[12.5px] leading-relaxed text-[#C9D2EC] text-balance">
                  {t(previewLab.subtitleKey as I18nKey)}
                </p>
                <div>
                  <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-mute-2">
                    {t("labs.steps")}
                  </div>
                  <ol className="space-y-2">
                    {previewLab.stepsKeys.map((k, i) => (
                      <li key={k} className="flex gap-3 rounded-lg p-2 hover:bg-white/[0.03]">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] font-mono font-semibold text-white">
                          {i + 1}
                        </span>
                        <span className="text-[12.5px] leading-relaxed text-[#C9D2EC]">
                          {t(k as I18nKey)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    startLab(previewLab.id);
                    setShowLabs(false);
                  }}
                  className="btn-primary mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-semibold"
                >
                  <Play className="h-4 w-4" />
                  {t("labs.start")} — {t(previewLab.titleKey as I18nKey)}
                </button>
              </div>
            ) : (
              <div className="grid h-full place-items-center text-center text-[12.5px] text-mute">
                Hover or click a lab to preview.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  ) : null;

  // Active-lab guide overlay
  const active = activeLabId ? LABS.find((l) => l.id === activeLabId) : null;
  const activeDecor = active ? DECOR[active.id as LabId] : null;
  const guide =
    active && activeDecor ? (
      <div className="pointer-events-none absolute left-4 top-20 z-30 w-[340px] max-w-[calc(100vw-2rem)] animate-fade-up">
        <div className="glass pointer-events-auto overflow-hidden rounded-2xl shadow-glass">
          <header className="flex items-start gap-3 border-b border-white/[0.06] px-4 py-3">
            <span className={cn("grid h-9 w-9 place-items-center rounded-lg ring-1", accentRing(activeDecor.accent))}>
              {activeDecor.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="truncate font-display text-[13.5px] font-semibold text-white">
                {t(active.titleKey as I18nKey)}
              </div>
              <div className="mt-0.5 text-[11px] text-mute">
                {t("labs.stepLabel")} {Math.min(active.stepsKeys.length, labStepIndex + 1)} /{" "}
                {active.stepsKeys.length}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveLabId(null)}
              aria-label={t("labs.close")}
              className="grid h-7 w-7 place-items-center rounded-md text-mute hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </header>

          {/* Progress bar */}
          <div className="px-4 pt-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-[width] duration-300",
                  activeDecor.accent === "ember"
                    ? "from-ember-400 to-ember-600"
                    : activeDecor.accent === "violet"
                      ? "from-violet2-400 to-violet2-600"
                      : activeDecor.accent === "plasma"
                        ? "from-plasma-400 to-plasma-600"
                        : activeDecor.accent === "ok"
                          ? "from-ok-400 to-ok-500"
                          : "from-spark-400 to-spark-600"
                )}
                style={{
                  width: `${
                    ((Math.min(active.stepsKeys.length - 1, labStepIndex) + 1) /
                      active.stepsKeys.length) *
                    100
                  }%`
                }}
              />
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="surface rounded-lg p-3 text-[12.5px] leading-relaxed text-[#E6EAF6] text-balance">
              {t(
                active.stepsKeys[Math.min(active.stepsKeys.length - 1, labStepIndex)] as I18nKey
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={prevLabStep}
                disabled={labStepIndex === 0}
                className="btn-ghost flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("labs.prev")}
              </button>
              <button
                type="button"
                onClick={() => nextLabStep(active.stepsKeys.length)}
                disabled={labStepIndex >= active.stepsKeys.length - 1}
                className="btn-primary flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] disabled:opacity-50"
              >
                {t("labs.next")}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={restartLab}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-mute hover:bg-white/[0.04] hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                {t("labs.restart")}
              </button>
              <button
                type="button"
                onClick={() => setShowLabs(true)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-mute hover:bg-white/[0.04] hover:text-white"
              >
                <Sparkles className="h-3 w-3" />
                {t("labs.open")}
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
