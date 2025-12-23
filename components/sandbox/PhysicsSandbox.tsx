"use client";

import { Sidebar } from "@/components/sandbox/Sidebar";
import { HoverTooltip } from "@/components/sandbox/overlays/HoverTooltip";
import { InspectorPanel } from "@/components/sandbox/overlays/InspectorPanel";
import { TopControls } from "@/components/sandbox/overlays/TopControls";
import { SandboxProvider } from "@/components/sandbox/SandboxContext";
import { SimulationCanvas } from "@/components/sandbox/SimulationCanvas";

export default function PhysicsSandbox() {
  return (
    <SandboxProvider>
      <div className="flex h-full w-full">
        <Sidebar />
        <div className="relative flex-1 overflow-hidden">
          <SimulationCanvas />
          <TopControls />
          <InspectorPanel />
          <HoverTooltip />
        </div>
      </div>
    </SandboxProvider>
  );
}

