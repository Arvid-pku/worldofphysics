"use client";

import { I18nProvider } from "@/components/i18n/I18nProvider";
import { KeyboardShortcuts } from "@/components/sandbox/KeyboardShortcuts";
import { RightPanel } from "@/components/sandbox/RightPanel";
import { Sidebar } from "@/components/sandbox/Sidebar";
import { EmptyStateOverlay } from "@/components/sandbox/overlays/EmptyStateOverlay";
import { HoverTooltip } from "@/components/sandbox/overlays/HoverTooltip";
import { LabsPanel } from "@/components/sandbox/overlays/LabsPanel";
import { ScenesPanel } from "@/components/sandbox/overlays/ScenesPanel";
import { ShortcutsOverlay } from "@/components/sandbox/overlays/ShortcutsOverlay";
import { TopControls } from "@/components/sandbox/overlays/TopControls";
import { WelcomeOverlay } from "@/components/sandbox/overlays/WelcomeOverlay";
import { SandboxProvider } from "@/components/sandbox/SandboxContext";
import { SimulationCanvas } from "@/components/sandbox/SimulationCanvas";
import { ToastProvider } from "@/components/ui/Toast";

export default function PhysicsSandbox() {
  return (
    <I18nProvider>
      <ToastProvider>
        <SandboxProvider>
          <KeyboardShortcuts />
          <div className="relative flex h-full w-full overflow-hidden">
            <Sidebar />
            <div className="flex min-w-0 flex-1 overflow-hidden">
              <div className="relative min-w-0 flex-1 overflow-hidden">
                <SimulationCanvas />
                <EmptyStateOverlay />
                <TopControls />
                <LabsPanel />
                <HoverTooltip />
              </div>
              <RightPanel />
            </div>
            <WelcomeOverlay />
            <ShortcutsOverlay />
            <ScenesPanel />
          </div>
        </SandboxProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
