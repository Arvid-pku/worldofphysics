"use client";

import { I18nProvider } from "@/components/i18n/I18nProvider";
import { KeyboardShortcuts } from "@/components/sandbox/KeyboardShortcuts";
import { RightPanel } from "@/components/sandbox/RightPanel";
import { Sidebar } from "@/components/sandbox/Sidebar";
import { HoverTooltip } from "@/components/sandbox/overlays/HoverTooltip";
import { LabsPanel } from "@/components/sandbox/overlays/LabsPanel";
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
          <div className="flex min-w-0 flex-1 overflow-hidden">
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <SimulationCanvas />
              <TopControls />
              <LabsPanel />
              <HoverTooltip />
            </div>
            <RightPanel />
          </div>
        </div>
      </SandboxProvider>
    </I18nProvider>
  );
}
