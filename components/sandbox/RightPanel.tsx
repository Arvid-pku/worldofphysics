"use client";

import { PanelRightClose, PanelRightOpen, Sigma, SlidersHorizontal, TrendingUp } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { FbdPanel } from "@/components/sandbox/overlays/FbdPanel";
import { GraphsPanel } from "@/components/sandbox/overlays/GraphsPanel";
import { BodyInspector } from "@/components/sandbox/overlays/inspector/BodyInspector";
import { ConstraintInspector } from "@/components/sandbox/overlays/inspector/ConstraintInspector";
import { FieldInspector } from "@/components/sandbox/overlays/inspector/FieldInspector";
import { cn } from "@/lib/utils/cn";

function TabButton({
  active,
  title,
  onClick,
  children
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-md border text-slate-200 transition",
        active
          ? "border-blue-500/40 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
          : "border-slate-800 bg-slate-950/40 hover:bg-slate-900/50"
      )}
    >
      {children}
    </button>
  );
}

export function RightPanel() {
  const { t } = useI18n();
  const { selected, clearSelection, rightPanelTab, setRightPanelTab, rightPanelCollapsed, setRightPanelCollapsed } =
    useSandbox();

  if (rightPanelCollapsed) {
    return (
      <aside className="flex h-full w-[52px] flex-col items-center gap-2 border-l border-slate-900 bg-slate-950/70 p-2">
        <button
          type="button"
          title={t("panel.expand")}
          onClick={() => setRightPanelCollapsed(false)}
          className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/60"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
        <div className="mt-2 grid gap-2">
          <TabButton
            active={rightPanelTab === "inspector"}
            title={t("panel.tab.inspector")}
            onClick={() => {
              setRightPanelTab("inspector");
              setRightPanelCollapsed(false);
            }}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </TabButton>
          <TabButton
            active={rightPanelTab === "graphs"}
            title={t("panel.tab.graphs")}
            onClick={() => {
              setRightPanelTab("graphs");
              setRightPanelCollapsed(false);
            }}
          >
            <TrendingUp className="h-4 w-4" />
          </TabButton>
          <TabButton
            active={rightPanelTab === "fbd"}
            title={t("panel.tab.fbd")}
            onClick={() => {
              setRightPanelTab("fbd");
              setRightPanelCollapsed(false);
            }}
          >
            <Sigma className="h-4 w-4" />
          </TabButton>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[420px] flex-col border-l border-slate-900 bg-slate-950/70">
      <header className="flex items-center justify-between gap-2 border-b border-slate-900 p-3">
        <div className="flex items-center gap-2">
          <TabButton
            active={rightPanelTab === "inspector"}
            title={t("panel.tab.inspector")}
            onClick={() => setRightPanelTab("inspector")}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </TabButton>
          <TabButton
            active={rightPanelTab === "graphs"}
            title={t("panel.tab.graphs")}
            onClick={() => setRightPanelTab("graphs")}
          >
            <TrendingUp className="h-4 w-4" />
          </TabButton>
          <TabButton
            active={rightPanelTab === "fbd"}
            title={t("panel.tab.fbd")}
            onClick={() => setRightPanelTab("fbd")}
          >
            <Sigma className="h-4 w-4" />
          </TabButton>
        </div>

        <button
          type="button"
          title={t("panel.collapse")}
          onClick={() => setRightPanelCollapsed(true)}
          className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/60"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3 [scrollbar-color:rgba(148,163,184,0.25)_transparent] [scrollbar-width:thin]">
        {rightPanelTab === "inspector" ? (
          <div className="grid gap-3">
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 shadow-xl backdrop-blur">
              <div>
                <div className="text-sm font-semibold text-slate-100">{t("inspector.title")}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {selected.kind === "body"
                    ? t("inspector.subtitleBody")
                    : selected.kind === "constraint"
                      ? t("inspector.subtitleConstraint")
                    : selected.kind === "field"
                      ? t("inspector.subtitleField")
                      : t("panel.emptyInspector")}
                </div>
              </div>
              {selected.kind !== "none" ? (
                <button
                  type="button"
                  title={t("inspector.close")}
                  onClick={clearSelection}
                  className="h-9 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-xs text-slate-200 hover:bg-slate-900/50"
                >
                  {t("panel.clearSelection")}
                </button>
              ) : null}
            </div>

            {selected.kind === "body" ? (
              <BodyInspector bodyId={selected.id} />
            ) : selected.kind === "constraint" ? (
              <ConstraintInspector constraintId={selected.id} />
            ) : selected.kind === "field" ? (
              <FieldInspector fieldId={selected.id} />
            ) : (
              <div className="grid place-items-center rounded-2xl border border-slate-800/70 bg-slate-950/35 p-8 text-xs text-slate-400">
                {t("panel.emptyInspector")}
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
