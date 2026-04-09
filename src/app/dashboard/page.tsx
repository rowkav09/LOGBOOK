"use client";

import { useGameState } from "@/contexts/GameStateProvider";
import { xpForLevel, getStreakMultiplier } from "@/lib/xp";

export default function DashboardPage() {
  const { totalXp, level, currentStreak, longestStreak, characters, entries, ready } = useGameState();

  if (!ready) return null;

  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelXp = xpForLevel(level);
  const progress = nextLevelXp > currentLevelXp
    ? ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 0;
  const multiplier = getStreakMultiplier(currentStreak);

  return (
    <main className="min-h-screen px-4 py-6 md:p-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Dashboard</h1>

      <div className="max-w-3xl space-y-4">
        {/* Level + XP bar */}
        <div className="border border-border bg-surface p-6">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-3xl font-bold text-accent">Lv. {level}</span>
              <span className="text-sm text-text-muted ml-3">{totalXp} XP</span>
            </div>
            <span className="text-xs text-text-muted">
              {nextLevelXp - totalXp} XP to next level
            </span>
          </div>
          <div className="w-full h-2 bg-background">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-border bg-surface p-5">
            <h2 className="text-xs text-text-muted uppercase tracking-wide">Streak</h2>
            <p className="text-2xl font-bold text-accent mt-2">{currentStreak}d</p>
            {multiplier > 1 && (
              <p className="text-xs text-text-muted mt-1">{multiplier}x multiplier</p>
            )}
          </div>
          <div className="border border-border bg-surface p-5">
            <h2 className="text-xs text-text-muted uppercase tracking-wide">Best Streak</h2>
            <p className="text-2xl font-bold text-text-primary mt-2">{longestStreak}d</p>
          </div>
          <div className="border border-border bg-surface p-5">
            <h2 className="text-xs text-text-muted uppercase tracking-wide">Journal Entries</h2>
            <p className="text-2xl font-bold text-text-primary mt-2">{entries.length}</p>
          </div>
          <div className="border border-border bg-surface p-5">
            <h2 className="text-xs text-text-muted uppercase tracking-wide">Characters</h2>
            <p className="text-2xl font-bold text-text-primary mt-2">{characters.length}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
