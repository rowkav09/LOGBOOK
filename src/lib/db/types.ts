import type { CharacterType, CharacterLabel } from "@/lib/constants";

export interface Character {
  id: string;
  name: string;
  description: string;
  position: [number, number, number];
  type: CharacterType;
  label: CharacterLabel;
  mentionCount: number;
}

export interface CharacterLink {
  from: string;
  to: string;
}

export interface Entry {
  id: string;
  content: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  mentionedCharacterIds: string[];
  xpEarned: number;
}

export interface GameState {
  characters: Character[];
  links: CharacterLink[];
  entries: Entry[];
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  achievements: import("@/lib/achievements").UnlockedAchievement[];
}
