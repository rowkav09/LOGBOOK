import type { Entry, Character } from "@/lib/db/types";

export const XP_PER_ENTRY = 50;
export const XP_PER_MENTION = 10;

export const MILESTONE_XP: Record<number, number> = {
  10: 100,
  25: 250,
  50: 500,
  100: 1000,
};

export const RANK_THRESHOLDS: [number, string][] = [
  [100, "Legendary"],
  [50, "Bonded"],
  [25, "Close"],
  [10, "Known"],
  [5, "Familiar"],
  [0, "Stranger"],
];

export function getRank(mentionCount: number): string {
  for (const [threshold, rank] of RANK_THRESHOLDS) {
    if (mentionCount >= threshold) return rank;
  }
  return "Stranger";
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 5;
  if (streak >= 14) return 3;
  if (streak >= 7) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

export function calculateStreak(entryDates: string[]): number {
  if (entryDates.length === 0) return 0;
  const sorted = [...Array.from(new Set(entryDates))].sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function calculateLongestStreak(entryDates: string[]): number {
  if (entryDates.length === 0) return 0;
  const sorted = [...Array.from(new Set(entryDates))].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100));
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

export function calculateTotalXp(entries: Entry[], characters: Character[]): number {
  let xp = 0;

  // XP from entries
  for (const entry of entries) {
    xp += entry.xpEarned;
  }

  // Milestone bonuses from character mention counts
  for (const char of characters) {
    for (const [threshold, bonus] of Object.entries(MILESTONE_XP)) {
      if (char.mentionCount >= Number(threshold)) {
        xp += bonus;
      }
    }
  }

  return xp;
}

export function calculateEntryXp(streak: number, mentionCount: number): number {
  const base = XP_PER_ENTRY;
  const multiplier = getStreakMultiplier(streak);
  const mentionXp = mentionCount * XP_PER_MENTION;
  return Math.floor(base * multiplier + mentionXp);
}
