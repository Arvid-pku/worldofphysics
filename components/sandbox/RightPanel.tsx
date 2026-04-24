"use client";

import {
  PanelRightClose,
  PanelRightOpen,
  Sigma,
  SlidersHorizontal,
  TrendingUp,
  X
} from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { FbdPanel } from "@/components/sandbox/overlays/FbdPanel";
import { GraphsPanel } from "@/components/sandbox/overlays/GraphsPanel";
import { BodyInspector } from "@/components/sandbox/overlays/inspector/BodyInspector";
import { ConstraintInspector } from "@/components/sandbox/overlays/inspector/ConstraintInspector";
import { FieldInspector } from "@/components/sandbox/overlays/inspector/FieldInspector";
import { IconButton } from "@/components/ui/IconButton";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils/cn";

function TabButton({
  active,
  title,
  icon,
  label,
  onClick,
  shortcut
}: {
  active: boolean;
  title: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <Tooltip label={title} side="bottom" shortcut={shortcut}>
      <button
        type="button"
        aria-label={title}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "group relative flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition",
          active
            ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]"
            : "text-[#A6B1D8] hover:bg-white/[0.04] hover:text-white"
        )}
      >
        {active ? (
          <span
            aria-hidden
            className="absolute inset-x-2 -bottom-[3px] h-[2px] rounded-full bg-gradient-to-r from-spark-400 to-plasma-400 shadow-[0_0_8px_rgba(61,151,255,0.6)]"
          />
        ) : null}
        <span>{icon}</span>
        <span>{label}</span>
      </button>
    </Tooltip>
  );
}

function EmptyInspectorIllustration() {
  return (
    <svg
      viewBox="0 0 200 140"
      className="h-32 w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="ill-grad" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3D97FF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#15CDF5" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="ill-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#3D97FF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3D97FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* sparse dot grid */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = (i % 10) * 20 + 10;
        const y = Math.floor(i / 10) * 20 + 20;
        return <circle key={i} cx={x} cy={y} r={1} fill="rgba(255,255,255,0.10)" />;
      })}
      {/* dashed selection ring */}
      <ellipse cx="100" cy="78" rx="40" ry="40" fill="url(#ill-glow)" />
      <circle
        cx="100"
        cy="78"
        r="34"
        stroke="url(#ill-grad)"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />
      {/* floating body */}
      <circle cx="100" cy="78" r="18" fill="rgba(15,23,56,0.95)" stroke="url(#ill-grad)" strokeWidth="2" />
      <circle cx="100" cy="78" r="3" fill="#fff" />
      {/* arrow */}
      <path
        d="M124 56 L150 30"
        stroke="#FF9D2E"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M150 30 L142 32 L148 38 Z" fill="#FF9D2E" />
    </svg>
  );
}

function CollapsedRightRail() {
  const { t } = useI18n();
  const { rightPanelTab, setRightPanelTab, setRightPanelCollapsed } = useSandbox();
  return (
    <aside className="flex h-full w-[52px] flex-col items-center gap-1.5 border-l border-white/[0.06] bg-ink-950/80 p-2">
      <Tooltip label={t("panel.expand")} side="left">
        <IconButton
          size="sm"
          variant="subtle"
          onClick={() => setRightPanelCollapsed(false)}
          aria-label={t("panel.expand")}
        >
          <PanelRightOpen className="h-4 w-4" />
        </IconButton>
      </Tooltip>
      <div className="my-1 h-px w-7 bg-white/[0.06]" />
      <Tooltip label={t("panel.tab.inspector")} side="left">
        <IconButton
          size="sm"
          variant="subtle"
          active={rightPanelTab === "inspector"}
          onClick={() => {
            setRightPanelTab("inspector");
            setRightPanelCollapsed(false);
          }}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </IconButton>
      </Tooltip>
      <Tooltip label={t("panel.tab.graphs")} side="left">
        <IconButton
          size="sm"
          variant="subtle"
          active={rightPanelTab === "graphs"}
          onClick={() => {
            setRightPanelTab("graphs");
            setRightPanelCollapsed(false);
          }}
        >
          <TrendingUp className="h-4 w-4" />
        </IconButton>
      </Tooltip>
      <Tooltip label={t("panel.tab.fbd")} side="left">
        <IconButton
          size="sm"
          variant="subtle"
          active={rightPanelTab === "fbd"}
          onClick={() => {
            setRightPanelTab("fbd");
            setRightPanelCollapsed(false);
          }}
        >
          <Sigma className="h-4 w-4" />
        </IconButton>
      </Tooltip>
    </aside>
  );
}

export function RightPanel() {
  const { t } = useI18n();
  const {
    selected,
    clearSelection,
    rightPanelTab,
    setRightPanelTab,
    rightPanelCollapsed,
    setRightPanelCollapsed
  } = useSandbox();

  if (rightPanelCollapsed) return <CollapsedRightRail />;

  const subtitle =
    selected.kind === "body"
      ? t("inspector.subtitleBody")
      : selected.kind === "constraint"
        ? t("inspector.subtitleConstraint")
        : selected.kind === "field"
          ? t("inspector.subtitleField")
          : t("panel.emptyInspector");

  const headerIcon =
    rightPanelTab === "graphs" ? (
      <TrendingUp className="h-5 w-5 text-plasma-300" />
    ) : rightPanelTab === "fbd" ? (
      <Sigma className="h-5 w-5 text-ember-300" />
    ) : (
      <SlidersHorizontal className="h-5 w-5 text-spark-200" />
    );

  const headerTitle =
    rightPanelTab === "graphs"
      ? t("panel.tab.graphs")
      : rightPanelTab === "fbd"
        ? t("panel.tab.fbd")
        : t("inspector.title");

  const headerSubtitle =
    rightPanelTab === "graphs"
      ? t("graphs.subtitle")
      : rightPanelTab === "fbd"
        ? t("fbd.subtitle")
        : subtitle;

  const accent =
    rightPanelTab === "graphs" ? "plasma" : rightPanelTab === "fbd" ? "ember" : "spark";

  return (
    <aside className="relative flex h-full w-[360px] shrink-0 flex-col border-l border-white/[0.06] bg-ink-950/80 backdrop-blur">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-spark-500/[0.06] to-transparent" />

      <div className="border-b border-white/[0.06] p-3">
        <PanelHeader
          icon={headerIcon}
          title={headerTitle}
          subtitle={headerSubtitle}
          accent={accent}
          actions={
            <>
              {selected.kind !== "none" && rightPanelTab === "inspector" ? (
                <Tooltip label={t("panel.clearSelection")} side="bottom">
                  <IconButton
                    size="sm"
                    variant="subtle"
                    onClick={clearSelection}
                    aria-label={t("panel.clearSelection")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </IconButton>
                </Tooltip>
              ) : null}
              <Tooltip label={t("panel.collapse")} side="bottom">
                <IconButton
                  size="sm"
                  variant="subtle"
                  onClick={() => setRightPanelCollapsed(true)}
                  aria-label={t("panel.collapse")}
                >
                  <PanelRightClose className="h-3.5 w-3.5" />
                </IconButton>
              </Tooltip>
            </>
          }
        />

        <div className="surface mt-3 flex items-center gap-1 rounded-full p-1">
          <TabButton
            active={rightPanelTab === "inspector"}
            title={t("panel.tab.inspector")}
            label={t("panel.tab.inspector")}
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            onClick={() => setRightPanelTab("inspector")}
            shortcut="I"
          />
          <TabButton
            active={rightPanelTab === "graphs"}
            title={t("panel.tab.graphs")}
            label={t("panel.tab.graphs")}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            onClick={() => setRightPanelTab("graphs")}
            shortcut="G"
          />
          <TabButton
            active={rightPanelTab === "fbd"}
            title={t("panel.tab.fbd")}
            label={t("panel.tab.fbd")}
            icon={<Sigma className="h-3.5 w-3.5" />}
            onClick={() => setRightPanelTab("fbd")}
            shortcut="F"
          />
        </div>
      </div>

      <div className="scroll-pretty min-h-0 flex-1 overflow-y-auto p-3">
        {rightPanelTab === "inspector" ? (
          <div className="grid gap-3">
            {selected.kind === "body" ? (
              <BodyInspector bodyId={selected.id} />
            ) : selected.kind === "constraint" ? (
              <ConstraintInspector constraintId={selected.id} />
            ) : selected.kind === "field" ? (
              <FieldInspector fieldId={selected.id} />
            ) : (
              <div className="surface flex flex-col items-center gap-3 rounded-2xl p-6 text-center">
                <EmptyInspectorIllustration />
                <div className="space-y-1">
                  <div className="font-display text-[14px] font-semibold text-white">
                    {t("panel.emptyInspector")}
                  </div>
                  <div className="text-[11.5px] text-mute">
                    Click any body, constraint, or field on the canvas.
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : rightPanelTab === "graphs" ? (
          <GraphsPanel />
        ) : (
          <FbdPanel />
        )}
      </div>
    </aside>
  );
}
