"use client";

import {
  Cable,
  BookOpen,
  Circle,
  DraftingCompass,
  Hand,
  Link2,
  Languages,
  Magnet,
  MoveRight,
  MousePointer2,
  Navigation2,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
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
import { SCENE_MODULES } from "@/lib/library/modules";
import type { ToolId } from "@/lib/physics/types";
import { cn } from "@/lib/utils/cn";

type ToolButtonProps = {
  id: ToolId;
  label: string;
  icon: React.ReactNode;
  collapsed?: boolean;
};

function ToolButton({ id, label, icon, collapsed }: ToolButtonProps) {
  const { tool, setTool } = useSandbox();
  const { t } = useI18n();
  const active = tool === id;
  const hint = id === "select" ? t("sidebar.hint.click") : t("sidebar.hint.drag");
  return (
    <button
      type="button"
      title={label}
      onClick={() => setTool(id)}
      className={cn(
        "group flex w-full items-center rounded-md text-left text-sm transition",
        collapsed ? "justify-center px-1 py-2.5" : "gap-2 px-2 py-2",
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
      {!collapsed ? <span className="truncate">{label}</span> : null}
      {!collapsed ? (
        <span className="ml-auto text-xs text-slate-500 opacity-0 transition group-hover:opacity-100">{hint}</span>
      ) : null}
    </button>
  );
}

function Section({ title, children, collapsed }: { title: string; children: React.ReactNode; collapsed?: boolean }) {
  return (
    <div className="space-y-2">
      <div className={cn("px-2 text-xs font-medium uppercase tracking-widest text-slate-500", collapsed ? "sr-only" : "")}>
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function Sidebar() {
  const { t, lang, setLang } = useI18n();
  const { setShowLabs, sidebarCollapsed, setSidebarCollapsed } = useSandbox();
  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-5 border-r border-slate-900 bg-slate-950/80 transition-[width,padding] duration-200",
        sidebarCollapsed ? "w-[72px] p-2" : "w-[320px] p-4"
      )}
    >
      <header className={cn("flex items-center justify-between", sidebarCollapsed ? "flex-col gap-2" : "")}>
        {!sidebarCollapsed ? (
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-100">{t("sidebar.title")}</div>
            <div className="text-xs text-slate-500">{t("sidebar.subtitle")}</div>
          </div>
        ) : (
          <div className="h-2" />
        )}

        <div className={cn("flex items-center gap-2", sidebarCollapsed ? "flex-col" : "")}>
          <button
            type="button"
            title={sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/60"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <button
            type="button"
            title={t("labs.open")}
            onClick={() => setShowLabs(true)}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/60"
          >
            <BookOpen className="h-4 w-4" />
          </button>

          {sidebarCollapsed ? (
            <button
              type="button"
              title={t("lang.label")}
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/60"
            >
              <Languages className="h-4 w-4" />
            </button>
          ) : (
            <LanguageSwitcher />
          )}
        </div>
      </header>

      <div className={cn("flex-1 overflow-auto [scrollbar-color:rgba(148,163,184,0.25)_transparent] [scrollbar-width:thin]", sidebarCollapsed ? "space-y-4 pr-0" : "space-y-5 pr-1")}>
        <Section title={t("sidebar.section.navigate")} collapsed={sidebarCollapsed}>
          <ToolButton id="select" label={t("tool.select")} icon={<MousePointer2 className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="pan" label={t("tool.pan")} icon={<Hand className="h-4 w-4" />} collapsed={sidebarCollapsed} />
        </Section>

        <Section title={t("sidebar.section.measure")} collapsed={sidebarCollapsed}>
          <ToolButton id="velocity" label={t("tool.velocity")} icon={<Navigation2 className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="ruler" label={t("tool.ruler")} icon={<Ruler className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="protractor" label={t("tool.protractor")} icon={<DraftingCompass className="h-4 w-4" />} collapsed={sidebarCollapsed} />
        </Section>

        <Section title={t("sidebar.section.shapes")} collapsed={sidebarCollapsed}>
          <ToolButton id="circle" label={t("tool.circle")} icon={<Circle className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="rectangle" label={t("tool.rectangle")} icon={<Square className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="polygon" label={t("tool.polygon")} icon={<Triangle className="h-4 w-4" />} collapsed={sidebarCollapsed} />
        </Section>

        <Section title={t("sidebar.section.constraints")} collapsed={sidebarCollapsed}>
          <ToolButton id="rod" label={t("tool.rod")} icon={<Link2 className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="rope" label={t("tool.rope")} icon={<Cable className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="rigid_rope" label={t("tool.rigidRope")} icon={<Cable className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="spring" label={t("tool.spring")} icon={<Waves className="h-4 w-4" />} collapsed={sidebarCollapsed} />
        </Section>

        <Section title={t("sidebar.section.statics")} collapsed={sidebarCollapsed}>
          <ToolButton id="pin" label={t("tool.pin")} icon={<Pin className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="wall" label={t("tool.wall")} icon={<Square className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="slope" label={t("tool.slope")} icon={<TrendingUp className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="conveyor" label={t("tool.conveyor")} icon={<MoveRight className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="track" label={t("tool.track")} icon={<Spline className="h-4 w-4" />} collapsed={sidebarCollapsed} />
        </Section>

        <Section title={t("sidebar.section.fields")} collapsed={sidebarCollapsed}>
          <ToolButton id="field_e_rect" label={t("tool.fieldErect")} icon={<Zap className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="field_e_circle" label={t("tool.fieldEcircle")} icon={<Zap className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="field_b_rect" label={t("tool.fieldBrect")} icon={<Magnet className="h-4 w-4" />} collapsed={sidebarCollapsed} />
          <ToolButton id="field_b_circle" label={t("tool.fieldBcircle")} icon={<Magnet className="h-4 w-4" />} collapsed={sidebarCollapsed} />
        </Section>

        {!sidebarCollapsed ? (
          <Section title={t("sidebar.section.library")}>
            <div className="grid gap-2">
              {SCENE_MODULES.map((m) => (
                <div
                  key={m.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-wop-module", m.id);
                    e.dataTransfer.setData("text/plain", m.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="cursor-grab rounded-xl border border-slate-800/70 bg-slate-950/40 p-3 text-left text-sm text-slate-100 hover:bg-slate-900/40 active:cursor-grabbing"
                >
                  <div className="text-sm font-semibold text-slate-100">{t(m.titleKey)}</div>
                  <div className="mt-1 text-xs text-slate-500">{t(m.subtitleKey)}</div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {!sidebarCollapsed ? (
          <div className="rounded-lg border border-slate-900 bg-slate-950/60 p-3 text-xs text-slate-400">
            {t("sidebar.tip")}
          </div>
        ) : null}
      </div>

      {!sidebarCollapsed ? (
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
      ) : (
        <div className="h-2" />
      )}
    </aside>
  );
}
