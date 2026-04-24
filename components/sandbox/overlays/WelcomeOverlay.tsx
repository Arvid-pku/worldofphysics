"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Atom, Compass, Keyboard, LineChart, Sparkles, X } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { BrandMark } from "@/components/ui/Brand";
import { STORAGE_KEYS, readBool, writeBool } from "@/lib/utils/storage";
import { cn } from "@/lib/utils/cn";

function FeatureCard({
  icon,
  title,
  description,
  accent
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: "spark" | "ember" | "violet" | "plasma";
}) {
  const ring =
    accent === "ember"
      ? "ring-ember-400/30 bg-ember-500/10 text-ember-300"
      : accent === "violet"
        ? "ring-violet2-400/30 bg-violet2-500/10 text-violet2-400"
        : accent === "plasma"
          ? "ring-plasma-400/30 bg-plasma-500/10 text-plasma-300"
          : "ring-spark-400/30 bg-spark-500/10 text-spark-200";
  return (
    <div className="surface relative overflow-hidden rounded-xl p-4">
      <div
        aria-hidden
        className={cn(
          "absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-30 blur-2xl",
          accent === "ember"
            ? "bg-ember-500"
            : accent === "violet"
              ? "bg-violet2-500"
              : accent === "plasma"
                ? "bg-plasma-500"
                : "bg-spark-500"
        )}
      />
      <div className={cn("grid h-9 w-9 place-items-center rounded-lg ring-1", ring)}>{icon}</div>
      <div className="mt-3 font-display text-[14px] font-semibold text-white">{title}</div>
      <div className="mt-1 text-[12px] leading-snug text-mute">{description}</div>
    </div>
  );
}

export function WelcomeOverlay() {
  const { t } = useI18n();
  const { showWelcome, setShowWelcome, setShowLabs, setShowShortcuts } = useSandbox();
  const [dontShow, setDontShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Auto-open on first visit
  useEffect(() => {
    setMounted(true);
    const seen = readBool(STORAGE_KEYS.welcomeSeen, false);
    if (!seen) {
      // delay slightly so the canvas appears first
      const t = window.setTimeout(() => setShowWelcome(true), 350);
      return () => window.clearTimeout(t);
    }
  }, [setShowWelcome]);

  function close() {
    setShowWelcome(false);
    // Only persist dismissal if the user opted to never see it again. Otherwise
    // it'll auto-open again on the next fresh visit.
    if (dontShow) writeBool(STORAGE_KEYS.welcomeSeen, true);
  }

  if (!mounted || !showWelcome) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-6">
      <div
        aria-hidden
        className="absolute inset-0 animate-fade-in bg-ink-950/80 backdrop-blur-md"
        onClick={close}
      />
      <div
        role="dialog"
        aria-labelledby="welcome-title"
        className="glass-strong animate-scale-in relative flex w-[860px] max-w-full flex-col overflow-hidden rounded-3xl shadow-floating"
      >
        {/* Cosmic header */}
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-30%,rgba(61,151,255,0.35),rgba(124,58,237,0.22)_45%,transparent_70%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 dot-bg opacity-40 mask-fade-b"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-mute hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative px-8 pb-6 pt-9 text-center">
            <div className="mx-auto mb-4 grid place-items-center">
              <BrandMark size={56} />
            </div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-spark-200/80">
              {t("welcome.eyebrow")}
            </div>
            <h1
              id="welcome-title"
              className="mt-1 font-display text-[34px] font-semibold leading-tight text-white"
            >
              {t("welcome.title")}
            </h1>
            <p className="mx-auto mt-3 max-w-[560px] text-[13.5px] leading-relaxed text-mute text-balance">
              {t("welcome.subtitle")}
            </p>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 gap-3 px-7 sm:grid-cols-3">
          <FeatureCard
            icon={<Atom className="h-4 w-4" />}
            title={t("welcome.feature1.title")}
            description={t("welcome.feature1.desc")}
            accent="spark"
          />
          <FeatureCard
            icon={<LineChart className="h-4 w-4" />}
            title={t("welcome.feature2.title")}
            description={t("welcome.feature2.desc")}
            accent="plasma"
          />
          <FeatureCard
            icon={<Sparkles className="h-4 w-4" />}
            title={t("welcome.feature3.title")}
            description={t("welcome.feature3.desc")}
            accent="ember"
          />
        </div>

        {/* CTA row */}
        <div className="flex items-center justify-between gap-3 px-7 py-6">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-mute select-none">
            <input
              type="checkbox"
              className="wop-check"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
            />
            <span>{t("welcome.dismiss")}</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                close();
                setShowShortcuts(true);
              }}
              className="btn-ghost flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium"
            >
              <Keyboard className="h-4 w-4" />
              {t("welcome.exploreShortcuts")}
            </button>
            <button
              type="button"
              onClick={() => {
                close();
                setShowLabs(true);
              }}
              className="btn-ghost flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium"
            >
              <Compass className="h-4 w-4" />
              {t("welcome.openLab")}
            </button>
            <button
              type="button"
              onClick={close}
              className="btn-primary flex h-10 items-center gap-2 rounded-full px-5 text-[13px] font-semibold"
            >
              {t("welcome.startBlank")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
