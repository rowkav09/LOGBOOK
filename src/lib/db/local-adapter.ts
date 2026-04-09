import type { Character, CharacterLink, Entry } from "./types";
import type { UnlockedAchievement } from "@/lib/achievements";

let userId = "anonymous";

export function setUserId(id: string) {
  userId = id;
}

function key(name: string): string {
  return `logbook_${userId}_${name}`;
}

function read<T>(name: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key(name));
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write<T>(name: string, data: T): void {
  localStorage.setItem(key(name), JSON.stringify(data));
}

export function getCharacters(): Character[] {
  return read<Character[]>("characters", []);
}

export function saveCharacters(characters: Character[]): void {
  write("characters", characters);
}

export function getLinks(): CharacterLink[] {
  return read<CharacterLink[]>("links", []);
}

export function saveLinks(links: CharacterLink[]): void {
  write("links", links);
}

export function getEntries(): Entry[] {
  return read<Entry[]>("entries", []);
}

export function saveEntries(entries: Entry[]): void {
  write("entries", entries);
}

export function getAchievements(): UnlockedAchievement[] {
  return read<UnlockedAchievement[]>("achievements", []);
}

export function saveAchievements(achievements: UnlockedAchievement[]): void {
  write("achievements", achievements);
}

export function getBonusXp(): number {
  return read<number>("bonus_xp", 0);
}

export function saveBonusXp(xp: number): void {
  write("bonus_xp", xp);
}

/** Clear old unscoped data from before auth */
export function clearLegacyData(): void {
  localStorage.removeItem("logbook_characters");
  localStorage.removeItem("logbook_links");
  localStorage.removeItem("logbook_entries");
}
