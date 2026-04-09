"use client";

import { GameStateProvider } from "./GameStateProvider";
import AuthGate from "@/components/AuthGate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GameStateProvider>
      <AuthGate>{children}</AuthGate>
    </GameStateProvider>
  );
}
