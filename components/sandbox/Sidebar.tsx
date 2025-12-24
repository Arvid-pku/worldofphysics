"use client";

import {
  Cable,
  BookOpen,
  Circle,
  DraftingCompass,
  Hand,
  Link2,
  Magnet,
  MoveRight,
  MousePointer2,
  Navigation2,
  Ruler,
  Spline,
  Square,
  Triangle,
  TrendingUp,
  Waves,
  Zap
} from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import type { ToolId } from "@/lib/physics/types";
import { cn } from "@/lib/utils/cn";

type ToolButtonProps = {
  id: ToolId;
  label: string;
  icon: React.ReactNode;
};

function ToolButton({ id, label, icon }: ToolButtonProps) {
  const { tool, setTool } = useSandbox();
  const { t } = useI18n();
  const active = tool === id;
  const hint = id === "select" ? t("sidebar.hint.click") : t("sidebar.hint.drag");
  return (
    <button
      type="button"
      onClick={() => setTool(id)}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition",
        active
          ? "bg-slate-800/70 text-slate-50 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]"
          : "text-slate-300 hover:bg-slate-900/60 hover:text-slate-100"
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-md border text-slate-200 transition",
          active ? "border-blue-500/40 bg-blue-500/10" : "border-slate-800 bg-slate-950/60"
        )}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
      <span className="ml-auto text-xs text-slate-500 opacity-0 transition group-hover:opacity-100">
        {hint}
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="px-2 text-xs font-medium uppercase tracking-widest text-slate-500">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function Sidebar() {
  const { t } = useI18n();
  const { setShowLabs } = useSandbox();
  return (
    <aside className="flex h-full w-[320px] flex-col gap-5 border-r border-slate-900 bg-slate-950/80 p-4">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-100">{t("sidebar.title")}</div>
          <div className="text-xs text-slate-500">{t("sidebar.subtitle")}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title={t("labs.open")}
            onClick={() => setShowLabs(true)}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/60"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-auto pr-1 [scrollbar-color:rgba(148,163,184,0.25)_transparent] [scrollbar-width:thin]">
        <Section title={t("sidebar.section.navigate")}>
          <ToolButton id="select" label={t("tool.select")} icon={<MousePointer2 className="h-4 w-4" />} />
          <ToolButton id="pan" label={t("tool.pan")} icon={<Hand className="h-4 w-4" />} />
        </Section>

        <Section title={t("sidebar.section.measure")}>
          <ToolButton id="velocity" label={t("tool.velocity")} icon={<Navigation2 className="h-4 w-4" />} />
          <ToolButton id="ruler" label={t("tool.ruler")} icon={<Ruler className="h-4 w-4" />} />
          <ToolButton id="protractor" label={t("tool.protractor")} icon={<DraftingCompass className="h-4 w-4" />} />
        </Section>

        <Section title={t("sidebar.section.shapes")}>
          <ToolButton id="circle" label={t("tool.circle")} icon={<Circle className="h-4 w-4" />} />
          <ToolButton id="rectangle" label={t("tool.rectangle")} icon={<Square className="h-4 w-4" />} />
          <ToolButton id="polygon" label={t("tool.polygon")} icon={<Triangle className="h-4 w-4" />} />
        </Section>

        <Section title={t("sidebar.section.constraints")}>
          <ToolButton id="rod" label={t("tool.rod")} icon={<Link2 className="h-4 w-4" />} />
          <ToolButton id="rope" label={t("tool.rope")} icon={<Cable className="h-4 w-4" />} />
          <ToolButton id="spring" label={t("tool.spring")} icon={<Waves className="h-4 w-4" />} />
        </Section>

        <Section title={t("sidebar.section.statics")}>
          <ToolButton id="wall" label={t("tool.wall")} icon={<Square className="h-4 w-4" />} />
          <ToolButton id="slope" label={t("tool.slope")} icon={<TrendingUp className="h-4 w-4" />} />
          <ToolButton id="conveyor" label={t("tool.conveyor")} icon={<MoveRight className="h-4 w-4" />} />
          <ToolButton id="track" label={t("tool.track")} icon={<Spline className="h-4 w-4" />} />
        </Section>

        <Section title={t("sidebar.section.fields")}>
          <ToolButton id="field_e_rect" label={t("tool.fieldErect")} icon={<Zap className="h-4 w-4" />} />
          <ToolButton id="field_e_circle" label={t("tool.fieldEcircle")} icon={<Zap className="h-4 w-4" />} />
          <ToolButton id="field_b_rect" label={t("tool.fieldBrect")} icon={<Magnet className="h-4 w-4" />} />
          <ToolButton id="field_b_circle" label={t("tool.fieldBcircle")} icon={<Magnet className="h-4 w-4" />} />
        </Section>

        <div className="rounded-lg border border-slate-900 bg-slate-950/60 p-3 text-xs text-slate-400">
          {t("sidebar.tip")}
        </div>
      </div>

      <footer className="flex items-center justify-between text-xs text-slate-500">
        <span className="truncate">{t("sidebar.footer")}</span>
        <a
          className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
          href="https://brm.io/matter-js/"
          target="_blank"
          rel="noreferrer"
        >
          {t("sidebar.docs")}
        </a>
      </footer>
    </aside>
  );
}
