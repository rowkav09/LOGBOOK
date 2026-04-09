"use client";

import Link from "next/link";
import GalaxyMap from "@/components/GalaxyMap";
import dynamic from "next/dynamic";

const CyberpunkMap = dynamic(() => import("@/components/CyberpunkMap"), { ssr: false });
import { useGameState } from "@/contexts/GameStateProvider";
import { xpForLevel, getStreakMultiplier } from "@/lib/xp";

export default function Home() {
  const { entries, totalXp, level, currentStreak, longestStreak, characters, displayName, ready, logout } = useGameState();

  if (!ready) return null;

  const today = new Date().toISOString().split("T")[0];
  const hasWrittenToday = entries.some((e) => e.date === today);

  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelXp = xpForLevel(level);
  const progress = nextLevelXp > currentLevelXp
    ? ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 0;
  const multiplier = getStreakMultiplier(currentStreak);

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: dashboard */}
      <div className="w-full lg:w-1/2 px-4 py-6 md:p-8 flex flex-col lg:justify-center">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-text-primary">
              Log<span className="text-accent">book</span>
            </h1>
            <p className="text-text-muted">
              {displayName ? `Welcome back, ${displayName}.` : "Your life, gamified."}
            </p>
          </div>
          <button
            onClick={logout}
            className="border border-border text-text-muted px-3 py-2 text-xs uppercase tracking-wide hover:border-red-500 hover:text-red-500 transition-colors"
          >
            Log out
          </button>
        </div>

        {/* Level + XP */}
        <div className="border border-border bg-surface p-6 mb-4">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-4xl font-bold text-accent">Lv. {level}</span>
              <span className="text-sm text-text-muted ml-3">{totalXp} XP</span>
            </div>
            <span className="text-xs text-text-muted">
              {nextLevelXp - totalXp} to next
            </span>
          </div>
          <div className="w-full h-2 bg-background">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="border border-border bg-surface p-4">
            <h2 className="text-xs text-text-muted uppercase tracking-wide">Streak</h2>
            <p className="text-2xl font-bold text-accent mt-1">{currentStreak}d</p>
            {multiplier > 1 && (
              <p className="text-[10px] text-text-muted mt-0.5">{multiplier}x multiplier</p>
            )}
          </div>
          <div className="border border-border bg-surface p-4">
            <h2 className="text-xs text-text-muted uppercase tracking-wide">Best Streak</h2>
            <p className="text-2xl font-bold text-text-primary mt-1">{longestStreak}d</p>
          </div>
          <div className="hidden md:block border border-border bg-surface p-4">
            <h2 className="text-xs text-text-muted uppercase tracking-wide">Entries</h2>
            <p className="text-2xl font-bold text-text-primary mt-1">{entries.length}</p>
          </div>
          <div className="hidden md:block border border-border bg-surface p-4">
            <h2 className="text-xs text-text-muted uppercase tracking-wide">Characters</h2>
            <p className="text-2xl font-bold text-text-primary mt-1">{characters.length}</p>
          </div>
        </div>

        {/* Mobile: big write entry CTA */}
        <Link
          href="/journal"
          className={`md:hidden border p-5 block transition-colors mb-6 ${
            hasWrittenToday
              ? "border-border bg-surface hover:border-accent"
              : "border-accent bg-surface hover:bg-accent/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              {hasWrittenToday ? "Today\u2019s Entry" : "Write Today\u2019s Entry"}
            </h2>
            <span className={`text-xs font-medium uppercase tracking-wide px-2 py-1 border ${
              hasWrittenToday
                ? "border-accent/30 text-accent/60"
                : "border-accent text-accent"
            }`}>
              {hasWrittenToday ? "Done" : "Not written"}
            </span>
          </div>
        </Link>

        {/* Actions — hidden on mobile since bottom nav covers these */}
        <div className="hidden md:flex flex-col gap-3">
          <Link
            href="/journal"
            className={`border p-5 block transition-colors ${
              hasWrittenToday
                ? "border-border bg-surface hover:border-accent"
                : "border-accent bg-surface hover:bg-accent/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">
                {hasWrittenToday ? "Today\u2019s Entry" : "Write Today\u2019s Entry"}
              </h2>
              <span className={`text-xs font-medium uppercase tracking-wide px-2 py-1 border ${
                hasWrittenToday
                  ? "border-accent/30 text-accent/60"
                  : "border-accent text-accent"
              }`}>
                {hasWrittenToday ? "Done" : "Not written"}
              </span>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/characters"
              className="border border-border bg-surface p-4 hover:border-accent transition-colors"
            >
              <h2 className="text-sm font-semibold text-text-primary">Characters</h2>
              <p className="text-xs text-text-muted mt-1">People in your story</p>
            </Link>
            <Link
              href="/map"
              className="border border-border bg-surface p-4 hover:border-accent transition-colors"
            >
              <h2 className="text-sm font-semibold text-text-primary">Map</h2>
              <p className="text-xs text-text-muted mt-1">Explore your area</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Right: two quadrants stacked */}
      <div className="w-full lg:w-1/2 flex flex-col border-t lg:border-t-0 lg:border-l border-border lg:min-h-screen">
        {/* Top-right: 3D character map */}
        <div className="h-[35vh] lg:h-1/2 relative">
          <GalaxyMap />
        </div>
        {/* Bottom-right: cyberpunk map — desktop only */}
        <div className="hidden lg:block h-1/2 relative border-t border-border">
          <CyberpunkMap />
        </div>
      </div>
    </main>
  );
}
