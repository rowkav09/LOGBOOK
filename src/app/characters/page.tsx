"use client";

import { useGameState } from "@/contexts/GameStateProvider";
import { CHARACTER_TYPES } from "@/lib/constants";
import { getRank } from "@/lib/xp";
import Link from "next/link";

export default function CharactersPage() {
  const { characters, ready } = useGameState();

  if (!ready) return null;

  const sorted = [...characters].sort((a, b) => b.mentionCount - a.mentionCount);

  return (
    <main className="min-h-screen px-4 py-6 md:p-8">
      <div className="flex items-center justify-between mb-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary">Characters</h1>
        <span className="text-sm text-text-muted">{characters.length} total</span>
      </div>

      {sorted.length === 0 ? (
        <div className="border border-border bg-surface p-6 max-w-3xl">
          <p className="text-text-muted">No characters yet. Add people on the <Link href="/map" className="text-accent hover:underline">map</Link>.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-3xl">
          {sorted.map((character) => {
            const typeInfo = CHARACTER_TYPES[character.type] || CHARACTER_TYPES.CONTACT;
            const rank = getRank(character.mentionCount);
            return (
              <div
                key={character.id}
                className="border border-border bg-surface px-4 py-3 md:px-5 md:py-4 flex items-center gap-3 md:gap-4"
              >
                {/* Type color dot */}
                <div
                  className="w-3 h-3 flex-shrink-0"
                  style={{
                    backgroundColor: typeInfo.color,
                    opacity: character.type === "GHOST" ? 0.4 : 1,
                  }}
                />

                {/* Name + label + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {character.name}
                    </span>
                    <span className="text-xs text-text-muted hidden sm:inline">{typeInfo.label}</span>
                    {character.label !== "none" && (
                      <span className="text-xs px-1.5 py-0.5 border border-border text-text-muted">
                        {character.label}
                      </span>
                    )}
                  </div>
                  {character.description && (
                    <p className="text-xs text-text-muted mt-1 truncate">{character.description}</p>
                  )}
                </div>

                {/* Mentions + rank */}
                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                  {character.mentionCount > 0 && (
                    <span className="text-xs text-accent">{rank}</span>
                  )}
                  <span className="text-xs text-text-muted tabular-nums">
                    {character.mentionCount}<span className="hidden sm:inline"> mention{character.mentionCount !== 1 ? "s" : ""}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
