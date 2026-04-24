"use client";

import { useMemo, useState } from "react";
import {
  Cable,
  BookOpen,
  Circle,
  DraftingCompass,
  Hand,
  HelpCircle,
  Hexagon,
  Keyboard,
  Languages,
  Link2,
  Magnet,
  MoveRight,
  MousePointer2,
  Navigation2,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Ruler,
  Search,
  Sparkles,
  Spline,
  Square,
  TrendingUp,
  Waves,
  Zap
} from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { BrandMark, BrandWordmark } from "@/components/ui/Brand";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { SCENE_MODULES } from "@/lib/library/modules";
import type { I18nKey } from "@/lib/i18n/dict";
import type { ToolId } from "@/lib/physics/types";
import { cn } from "@/lib/utils/cn";

type ToolEntry = {
  id: ToolId;
  labelKey: I18nKey;
  icon: React.ReactNode;
  shortcut?: string;
};

type SectionDef = {
  id: string;
  titleKey: I18nKey;
  accent: "spark" | "ember" | "violet" | "plasma" | "ok";
  icon: React.ReactNode;
  tools: ToolEntry[];
};

const SECTIONS: SectionDef[] = [
  {
    id: "navigate",
    titleKey: "sidebar.section.navigate",
    accent: "spark",
    icon: <MousePointer2 className="h-3.5 w-3.5" />,
    tools: [
      { id: "select", labelKey: "tool.select", icon: <MousePointer2 className="h-4 w-4" />, shortcut: "V" },
      { id: "pan", labelKey: "tool.pan", icon: <Hand className="h-4 w-4" />, shortcut: "H" }
    ]
  },
  {
    id: "measure",
    titleKey: "sidebar.section.measure",
    accent: "plasma",
    icon: <Ruler className="h-3.5 w-3.5" />,
    tools: [
      { id: "velocity", labelKey: "tool.velocity", icon: <Navigation2 className="h-4 w-4" />, shortcut: "L" },
      { id: "ruler", labelKey: "tool.ruler", icon: <Ruler className="h-4 w-4" />, shortcut: "M" },
      { id: "protractor", labelKey: "tool.protractor", icon: <DraftingCompass className="h-4 w-4" /> }
    ]
  },
  {
    id: "shapes",
    titleKey: "sidebar.section.shapes",
    accent: "ok",
    icon: <Circle className="h-3.5 w-3.5" />,
    tools: [
      { id: "circle", labelKey: "tool.circle", icon: <Circle className="h-4 w-4" />, shortcut: "C" },
      { id: "rectangle", labelKey: "tool.rectangle", icon: <Square className="h-4 w-4" />, shortcut: "R" },
      { id: "polygon", labelKey: "tool.polygon", icon: <Hexagon className="h-4 w-4" />, shortcut: "P" }
    ]
  },
  {
    id: "constraints",
    titleKey: "sidebar.section.constraints",
    accent: "ember",
    icon: <Link2 className="h-3.5 w-3.5" />,
    tools: [
      { id: "rod", labelKey: "tool.rod", icon: <Link2 className="h-4 w-4" /> },
      { id: "rope", labelKey: "tool.rope", icon: <Cable className="h-4 w-4" /> },
      { id: "rigid_rope", labelKey: "tool.rigidRope", icon: <Cable className="h-4 w-4" /> },
      { id: "spring", labelKey: "tool.spring", icon: <Waves className="h-4 w-4" /> }
    ]
  },
  {
    id: "statics",
    titleKey: "sidebar.section.statics",
    accent: "violet",
    icon: <Pin className="h-3.5 w-3.5" />,
    tools: [
      { id: "pin", labelKey: "tool.pin", icon: <Pin className="h-4 w-4" /> },
      { id: "wall", labelKey: "tool.wall", icon: <Square className="h-4 w-4" /> },
      { id: "slope", labelKey: "tool.slope", icon: <TrendingUp className="h-4 w-4" /> },
      { id: "conveyor", labelKey: "tool.conveyor", icon: <MoveRight className="h-4 w-4" /> },
      { id: "track", labelKey: "tool.track", icon: <Spline className="h-4 w-4" /> }
    ]
  },
  {
    id: "fields",
    titleKey: "sidebar.section.fields",
    accent: "spark",
    icon: <Zap className="h-3.5 w-3.5" />,
    tools: [
      { id: "field_e_rect", labelKey: "tool.fieldErect", icon: <Zap className="h-4 w-4" /> },
      { id: "field_e_circle", labelKey: "tool.fieldEcircle", icon: <Zap className="h-4 w-4" /> },
      { id: "field_b_rect", labelKey: "tool.fieldBrect", icon: <Magnet className="h-4 w-4" /> },
      { id: "field_b_circle", labelKey: "tool.fieldBcircle", icon: <Magnet className="h-4 w-4" /> }
    ]
  }
];

const ACCENT_DOT: Record<SectionDef["accent"], string> = {
  spark: "from-spark-400 to-spark-600",
  ember: "from-ember-400 to-ember-600",
  violet: "from-violet2-400 to-violet2-600",
  plasma: "from-plasma-400 to-plasma-600",
  ok: "from-ok-400 to-ok-500"
};

const ACCENT_BG: Record<SectionDef["accent"], string> = {
  spark: "bg-spark-500/10 ring-spark-400/30 text-spark-200",
  ember: "bg-ember-500/10 ring-ember-400/30 text-ember-300",
  violet: "bg-violet2-500/10 ring-violet2-400/30 text-violet2-400",
  plasma: "bg-plasma-500/10 ring-plasma-400/30 text-plasma-300",
  ok: "bg-ok-500/10 ring-ok-400/30 text-ok-400"
};

function ToolButton({
  entry,
  accent,
  collapsed
}: {
  entry: ToolEntry;
  accent: SectionDef["accent"];
  collapsed: boolean;
}) {
  const { tool, setTool } = useSandbox();
  const { t } = useI18n();
  const active = tool === entry.id;
  const label = t(entry.labelKey);

  const inner = (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={() => setTool(entry.id)}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg text-left text-[13px] transition",
        collapsed ? "h-10 px-1" : "h-10 pl-1.5 pr-2",
        "flex items-center gap-2.5",
        active
          ? "bg-white/[0.06] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          : "text-[#C9D2EC] hover:bg-white/[0.04] hover:text-white"
      )}
    >
      {active ? (
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b shadow-[0_0_12px_rgba(61,151,255,0.6)]",
            ACCENT_DOT[accent]
          )}
        />
      ) : null}
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-md ring-1 transition",
          active
            ? ACCENT_BG[accent]
            : "bg-white/[0.03] ring-white/[0.06] text-[#A6B1D8] group-hover:bg-white/[0.06] group-hover:ring-white/[0.10]"
        )}
      >
        {entry.icon}
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 truncate font-medium">{label}</span>
          {entry.shortcut ? (
            <span
              className={cn(
                "kbd ml-auto opacity-0 transition group-hover:opacity-100",
                active && "opacity-90"
              )}
            >
              {entry.shortcut}
            </span>
          ) : null}
        </>
      ) : null}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip
        label={label}
        shortcut={entry.shortcut}
        side="right"
      >
        {inner}
      </Tooltip>
    );
  }
  return inner;
}

function SectionHeader({
  section,
  collapsed
}: {
  section: SectionDef;
  collapsed: boolean;
}) {
  const { t } = useI18n();
  if (collapsed) return <div className="my-1 mx-2 h-px bg-white/[0.05]" />;
  return (
    <div className="flex items-center gap-2 px-1.5 pt-1">
      <span
        className={cn(
          "grid h-5 w-5 place-items-center rounded ring-1",
          ACCENT_BG[section.accent]
        )}
      >
        {section.icon}
      </span>
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-mute-2">
        {t(section.titleKey)}
      </span>
      <span className="ml-2 h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

export function Sidebar() {
  const { t, lang, setLang } = useI18n();
  const { setShowLabs, sidebarCollapsed, setSidebarCollapsed, setShowShortcuts, setShowWelcome } =
    useSandbox();
  const [query, setQuery] = useState("");

  const filteredSections = useMemo<SectionDef[]>(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.trim().toLowerCase();
    return SECTIONS.map((s) => ({
      ...s,
      tools: s.tools.filter((tool) => t(tool.labelKey).toLowerCase().includes(q))
    })).filter((s) => s.tools.length > 0);
  }, [query, t]);

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col gap-3 border-r border-white/[0.06] bg-ink-950/80 backdrop-blur transition-[width] duration-300 ease-out",
        sidebarCollapsed ? "w-[68px] p-2" : "w-[280px] p-3"
      )}
    >
      {/* subtle ambient gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 bg-radial-spotlight" />

      {/* Header */}
      <header className={cn("flex items-center gap-2", sidebarCollapsed ? "flex-col" : "")}>
        {!sidebarCollapsed ? (
          <BrandWordmark subtitle={t("brand.tagline")} className="flex-1" />
        ) : (
          <BrandMark size={30} />
        )}

        <Tooltip
          label={sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          side={sidebarCollapsed ? "right" : "bottom"}
          shortcut="["
        >
          <IconButton
            size="sm"
            variant="subtle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </IconButton>
        </Tooltip>
      </header>

      {/* Search & quick actions */}
      {!sidebarCollapsed ? (
        <div className="flex items-center gap-1.5">
          <div className="surface group flex h-9 flex-1 items-center gap-2 rounded-lg px-2.5 focus-within:ring-1 focus-within:ring-spark-400/40">
            <Search className="h-3.5 w-3.5 text-mute-2 group-focus-within:text-spark-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("sidebar.search")}
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-white placeholder:text-mute-2 outline-none"
            />
          </div>
          <Tooltip label={t("labs.open")} side="bottom" shortcut="L">
            <IconButton
              size="sm"
              variant="subtle"
              onClick={() => setShowLabs(true)}
              aria-label={t("labs.open")}
            >
              <Sparkles className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          <Tooltip label={t("controls.help")} side="bottom" shortcut="?">
            <IconButton
              size="sm"
              variant="subtle"
              onClick={() => setShowShortcuts(true)}
              aria-label={t("controls.help")}
            >
              <Keyboard className="h-4 w-4" />
            </IconButton>
          </Tooltip>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <Tooltip label={t("labs.open")} side="right" shortcut="L">
            <IconButton size="sm" variant="subtle" onClick={() => setShowLabs(true)}>
              <Sparkles className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          <Tooltip label={t("controls.help")} side="right" shortcut="?">
            <IconButton size="sm" variant="subtle" onClick={() => setShowShortcuts(true)}>
              <Keyboard className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          <div className="my-1 h-px w-6 bg-white/[0.08]" />
        </div>
      )}

      {/* Tools */}
      <div className="scroll-pretty min-h-0 flex-1 overflow-y-auto pr-0.5">
        <div className="space-y-3">
          {filteredSections.map((section) => (
            <div key={section.id} className="space-y-1">
              <SectionHeader section={section} collapsed={sidebarCollapsed} />
              <div className="space-y-0.5">
                {section.tools.map((entry) => (
                  <ToolButton
                    key={entry.id}
                    entry={entry}
                    accent={section.accent}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 ? (
            <div className="surface rounded-lg p-3 text-center text-[12px] text-mute">
              {t("sidebar.searchEmpty")}
            </div>
          ) : null}

          {/* Module library */}
          {!sidebarCollapsed && !query.trim() ? (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center gap-2 px-1.5 pt-1">
                <span className="grid h-5 w-5 place-items-center rounded ring-1 bg-violet2-500/10 ring-violet2-400/30 text-violet2-400">
                  <Sparkles className="h-3 w-3" />
                </span>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-mute-2">
                  {t("sidebar.section.library")}
                </span>
                <span className="ml-2 h-px flex-1 bg-white/[0.06]" />
              </div>
              <div className="grid gap-1.5">
                {SCENE_MODULES.map((m) => (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-wop-module", m.id);
                      e.dataTransfer.setData("text/plain", m.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="surface group cursor-grab rounded-lg p-2.5 text-left transition active:cursor-grabbing hover:ring-1 hover:ring-violet2-400/40"
                  >
                    <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white">
                      <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-violet2-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]" />
                      {t(m.titleKey)}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-mute">
                      {t(m.subtitleKey)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer */}
      {!sidebarCollapsed ? (
        <footer className="flex items-center justify-between border-t border-white/[0.05] pt-2 text-[11px] text-mute-2">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setShowWelcome(true)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-mute hover:bg-white/[0.04] hover:text-white"
            aria-label="About"
          >
            <HelpCircle className="h-3 w-3" />
            About
          </button>
        </footer>
      ) : (
        <div className="flex flex-col items-center gap-1.5 border-t border-white/[0.05] pt-2">
          <Tooltip label={t("lang.label")} side="right">
            <IconButton
              size="sm"
              variant="subtle"
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              aria-label={t("lang.label")}
            >
              <Languages className="h-4 w-4" />
            </IconButton>
          </Tooltip>
        </div>
      )}
    </aside>
  );
}
