"use client";

import { useGameState } from "@/contexts/GameStateProvider";
import { ACHIEVEMENTS } from "@/lib/achievements";

export default function AchievementsPage() {
  const { achievements, ready } = useGameState();

  if (!ready) return null;

  const unlockedMap = new Map(
    achievements.map((a) => [a.achievementId, a.unlockedAt])
  );

  return (
    <main className="min-h-screen px-4 py-6 md:p-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6 md:mb-8">Achievements</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl">
        {ACHIEVEMENTS.map((def) => {
          const unlockedAt = unlockedMap.get(def.id);
          const unlocked = !!unlockedAt;

          return (
            <div
              key={def.id}
              className="border border-border bg-surface p-4 flex flex-col gap-2"
            >
              <span
                className="text-sm font-bold tracking-wide"
                style={{ color: unlocked ? "#c8f135" : "#2a2a2a" }}
              >
                {def.name}
              </span>
              <span className="text-xs text-text-muted">{def.description}</span>
              {unlocked ? (
                <span className="text-[10px] text-text-muted font-mono mt-auto">
                  {new Date(unlockedAt).toLocaleDateString()}
                </span>
              ) : (
                <span
                  className="text-[10px] font-semibold tracking-wider mt-auto"
                  style={{ color: "#2a2a2a" }}
                >
                  LOCKED
                </span>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
