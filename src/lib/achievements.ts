import type { Character, Entry } from "@/lib/db/types";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: string; // ISO string
}

export interface AchievementContext {
  entries: Entry[];
  characters: Character[];
  currentStreak: number;
  longestStreak: number;
  latestEntryCreatedAt?: string; // ISO string of most recent entry's createdAt
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "FIRST_ENTRY",
    name: "FIRST ENTRY",
    description: "Log one entry",
    check: (ctx) => ctx.entries.length >= 1,
  },
  {
    id: "WEEK_STREAK",
    name: "WEEK STREAK",
    description: "7-day streak",
    check: (ctx) => ctx.longestStreak >= 7,
  },
  {
    id: "MONTH_STREAK",
    name: "MONTH STREAK",
    description: "30-day streak",
    check: (ctx) => ctx.longestStreak >= 30,
  },
  {
    id: "FIRST_CONTACT",
    name: "FIRST CONTACT",
    description: "Add first character",
    check: (ctx) => ctx.characters.length >= 1,
  },
  {
    id: "SOCIAL_MAP",
    name: "SOCIAL MAP",
    description: "Add 10 characters",
    check: (ctx) => ctx.characters.length >= 10,
  },
  {
    id: "VETERAN",
    name: "VETERAN",
    description: "50 total entries",
    check: (ctx) => ctx.entries.length >= 50,
  },
  {
    id: "NIGHT_OWL",
    name: "NIGHT OWL",
    description: "Entry logged after 11pm",
    check: (ctx) => {
      if (!ctx.latestEntryCreatedAt) return false;
      return ctx.entries.some((e) => {
        const hour = new Date(e.createdAt).getHours();
        return hour >= 23;
      });
    },
  },
];

export function checkAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: UnlockedAchievement[]
): UnlockedAchievement[] {
  const unlockedIds = new Set(alreadyUnlocked.map((a) => a.achievementId));
  const newlyUnlocked: UnlockedAchievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue;
    if (achievement.check(ctx)) {
      newlyUnlocked.push({
        achievementId: achievement.id,
        unlockedAt: new Date().toISOString(),
      });
    }
  }

  return newlyUnlocked;
}
