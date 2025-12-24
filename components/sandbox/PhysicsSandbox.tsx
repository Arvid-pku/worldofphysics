"use client";

import { I18nProvider } from "@/components/i18n/I18nProvider";
import { KeyboardShortcuts } from "@/components/sandbox/KeyboardShortcuts";
import { Sidebar } from "@/components/sandbox/Sidebar";
import { HoverTooltip } from "@/components/sandbox/overlays/HoverTooltip";
import { GraphsPanel } from "@/components/sandbox/overlays/GraphsPanel";
import { InspectorPanel } from "@/components/sandbox/overlays/InspectorPanel";
import { TopControls } from "@/components/sandbox/overlays/TopControls";
import { SandboxProvider } from "@/components/sandbox/SandboxContext";
import { SimulationCanvas } from "@/components/sandbox/SimulationCanvas";

export default function PhysicsSandbox() {
  return (
    <I18nProvider>
      <SandboxProvider>
        <KeyboardShortcuts />
        <div className="flex h-full w-full">
          <Sidebar />
          <div className="relative flex-1 overflow-hidden">
            <SimulationCanvas />
            <TopControls />
            <GraphsPanel />
            <InspectorPanel />
            <HoverTooltip />
          </div>
        </div>
      </SandboxProvider>
    </I18nProvider>
  );
}
