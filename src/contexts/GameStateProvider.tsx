"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Character, CharacterLink, Entry } from "@/lib/db/types";
import type { UnlockedAchievement } from "@/lib/achievements";
import { checkAchievements } from "@/lib/achievements";
import { createClient } from "@/lib/supabase";
import {
  calculateTotalXp,
  calculateLevel,
  calculateStreak,
  calculateLongestStreak,
  calculateEntryXp,
} from "@/lib/xp";
import { generateUUID } from "@/lib/uuid";

interface GameStateContextValue {
  ready: boolean;
  displayName: string;
  characters: Character[];
  links: CharacterLink[];
  entries: Entry[];
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  addCharacter: (char: Omit<Character, "mentionCount">) => void;
  updateCharacter: (char: Character) => void;
  deleteCharacter: (id: string) => void;
  setLinks: (links: CharacterLink[]) => void;
  addLink: (from: string, to: string) => void;
  removeLink: (from: string, to: string) => void;
  addEntry: (content: string, date: string) => void;
  updateEntryContent: (id: string, content: string) => void;
  deleteEntry: (id: string) => void;
  achievements: UnlockedAchievement[];
  bonusXp: number;
  addBonusXp: (xp: number) => void;
  logout: () => Promise<void>;
}

const GameStateContext = createContext<GameStateContextValue | null>(null);

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error("useGameState must be used within GameStateProvider");
  return ctx;
}

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [links, setLinksState] = useState<CharacterLink[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [achievements, setAchievements] = useState<UnlockedAchievement[]>([]);
  const [bonusXp, setBonusXp] = useState(0);
  const userIdRef = useRef<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Load all data from Supabase on mount
  useEffect(() => {
    async function init() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("[Logbook] session:", session ? "EXISTS (user: " + session.user.id + ")" : "NULL", sessionError || "");
      if (!session?.user) {
        setReady(true);
        return;
      }

      const userId = session.user.id;
      userIdRef.current = userId;

      // Load display name from user metadata
      const metaName = session.user.user_metadata?.display_name || "";
      console.log("[Logbook] display_name from metadata:", metaName || "(empty)");
      setDisplayName(metaName);

      // Load all data in parallel
      const [charRes, linkRes, entryRes, achieveRes, profileRes] = await Promise.all([
        supabase.from("characters").select("*").eq("user_id", userId),
        supabase.from("character_links").select("*").eq("user_id", userId),
        supabase.from("entries").select("*").eq("user_id", userId).order("date", { ascending: true }),
        supabase.from("achievements").select("*").eq("user_id", userId),
        supabase.from("profiles").select("display_name, bonus_xp").eq("id", userId).single(),
      ]);

      if (charRes.data) {
        setCharacters(charRes.data.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: c.name as string,
          description: (c.description || "") as string,
          position: c.position as [number, number, number],
          type: c.type as Character["type"],
          label: (c.label || "none") as Character["label"],
          mentionCount: (c.mention_count || 0) as number,
        })));
      }

      if (linkRes.data) {
        setLinksState(linkRes.data.map((l: Record<string, unknown>) => ({
          from: l.from_id as string,
          to: l.to_id as string,
        })));
      }

      if (entryRes.data) {
        setEntries(entryRes.data.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          content: e.content as string,
          date: e.date as string,
          createdAt: e.created_at as string,
          mentionedCharacterIds: (e.mentioned_character_ids || []) as string[],
          xpEarned: (e.xp_earned || 0) as number,
        })));
      }

      if (achieveRes.data) {
        setAchievements(achieveRes.data.map((a: Record<string, unknown>) => ({
          achievementId: a.achievement_id as string,
          unlockedAt: a.unlocked_at as string,
        })));
      }

      console.log("[Logbook] load results:", {
        characters: charRes.error?.message || `${charRes.data?.length} rows`,
        links: linkRes.error?.message || `${linkRes.data?.length} rows`,
        entries: entryRes.error?.message || `${entryRes.data?.length} rows`,
        achievements: achieveRes.error?.message || `${achieveRes.data?.length} rows`,
        profile: profileRes.error?.message || profileRes.data,
      });

      if (profileRes.data) {
        setBonusXp(profileRes.data.bonus_xp || 0);
        if (!session.user.user_metadata?.display_name && profileRes.data.display_name) {
          setDisplayName(profileRes.data.display_name);
        }
      }

      setReady(true);
    }
    init();
  }, [supabase]);

  // Check achievements after state changes
  useEffect(() => {
    if (!ready) return;
    const entryDates = entries.map((e) => e.date);
    const latestEntry = entries.length > 0 ? entries[entries.length - 1] : undefined;
    const ctx = {
      entries,
      characters,
      currentStreak: calculateStreak(entryDates),
      longestStreak: calculateLongestStreak(entryDates),
      latestEntryCreatedAt: latestEntry?.createdAt,
    };
    setAchievements((prev) => {
      const newlyUnlocked = checkAchievements(ctx, prev);
      if (newlyUnlocked.length === 0) return prev;
      // Save new achievements to Supabase
      if (userIdRef.current) {
        for (const a of newlyUnlocked) {
          supabase.from("achievements").insert({
            user_id: userIdRef.current,
            achievement_id: a.achievementId,
            unlocked_at: a.unlockedAt,
          }).then(() => {});
        }
      }
      return [...prev, ...newlyUnlocked];
    });
  }, [ready, entries, characters, supabase]);

  // Derived state
  const totalXp = useMemo(() => calculateTotalXp(entries, characters) + bonusXp, [entries, characters, bonusXp]);
  const level = useMemo(() => calculateLevel(totalXp), [totalXp]);
  const entryDates = useMemo(() => entries.map((e) => e.date), [entries]);
  const currentStreak = useMemo(() => calculateStreak(entryDates), [entryDates]);
  const longestStreak = useMemo(() => calculateLongestStreak(entryDates), [entryDates]);

  const addCharacter = useCallback((char: Omit<Character, "mentionCount">) => {
    const newChar = { ...char, mentionCount: 0 };
    setCharacters((prev) => [...prev, newChar]);
    if (userIdRef.current) {
      supabase.from("characters").insert({
        id: char.id,
        user_id: userIdRef.current,
        name: char.name,
        description: char.description,
        position: char.position,
        type: char.type,
        label: char.label,
        mention_count: 0,
      }).then(({ error }) => {
        if (error) console.error("[Logbook] insert character error:", error.message);
        else console.log("[Logbook] character saved to Supabase");
      });
    } else {
      console.warn("[Logbook] no userId — character not saved to Supabase");
    }
  }, [supabase]);

  const updateCharacter = useCallback((char: Character) => {
    setCharacters((prev) => prev.map((c) => (c.id === char.id ? char : c)));
    if (userIdRef.current) {
      supabase.from("characters").update({
        name: char.name,
        description: char.description,
        type: char.type,
        label: char.label,
        position: char.position,
        mention_count: char.mentionCount,
      }).eq("id", char.id).then(({ error }) => {
        if (error) console.error("[Logbook] update character error:", error.message);
      });
    }
  }, [supabase]);

  const deleteCharacter = useCallback((id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    setLinksState((prev) => prev.filter((l) => l.from !== id && l.to !== id));
    if (userIdRef.current) {
      supabase.from("characters").delete().eq("id", id).then(() => {});
      supabase.from("character_links").delete()
        .or(`from_id.eq.${id},to_id.eq.${id}`)
        .then(() => {});
    }
  }, [supabase]);

  const setLinks = useCallback((newLinks: CharacterLink[]) => {
    setLinksState(newLinks);
  }, []);

  const addLink = useCallback((from: string, to: string) => {
    setLinksState((prev) => {
      const exists = prev.some(
        (l) => (l.from === from && l.to === to) || (l.from === to && l.to === from)
      );
      if (exists) return prev;
      if (userIdRef.current) {
        supabase.from("character_links").insert({
          user_id: userIdRef.current,
          from_id: from,
          to_id: to,
        }).then(() => {});
      }
      return [...prev, { from, to }];
    });
  }, [supabase]);

  const removeLink = useCallback((from: string, to: string) => {
    setLinksState((prev) =>
      prev.filter((l) => !((l.from === from && l.to === to) || (l.from === to && l.to === from)))
    );
    if (userIdRef.current) {
      supabase.from("character_links").delete()
        .or(`and(from_id.eq.${from},to_id.eq.${to}),and(from_id.eq.${to},to_id.eq.${from})`)
        .then(() => {});
    }
  }, [supabase]);

  const addEntry = useCallback((content: string, date: string) => {
    setEntries((prev) => {
      const mentionedIds: string[] = [];
      // Use current characters from state via closure — read from latest
      const currentChars = characters;
      for (const char of currentChars) {
        const regex = new RegExp(`\\b${char.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (regex.test(content)) {
          mentionedIds.push(char.id);
        }
      }

      const allDates = [...prev.map((e) => e.date), date];
      const streak = calculateStreak(allDates);
      const xpEarned = calculateEntryXp(streak, mentionedIds.length);

      const entryId = generateUUID();
      const entry: Entry = {
        id: entryId,
        content,
        date,
        createdAt: new Date().toISOString(),
        mentionedCharacterIds: mentionedIds,
        xpEarned,
      };

      if (userIdRef.current) {
        supabase.from("entries").insert({
          id: entryId,
          user_id: userIdRef.current,
          content,
          date,
          xp_earned: xpEarned,
          mentioned_character_ids: mentionedIds,
        }).then(() => {});
      }

      if (mentionedIds.length > 0) {
        setCharacters((chars) =>
          chars.map((c) => {
            if (!mentionedIds.includes(c.id)) return c;
            const updated = { ...c, mentionCount: c.mentionCount + 1 };
            if (userIdRef.current) {
              supabase.from("characters").update({ mention_count: updated.mentionCount }).eq("id", c.id).then(() => {});
            }
            return updated;
          })
        );
      }

      return [...prev, entry];
    });
  }, [supabase, characters]);

  const updateEntryContent = useCallback((id: string, content: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, content } : e))
    );
    if (userIdRef.current) {
      supabase.from("entries").update({ content }).eq("id", id).then(() => {});
    }
  }, [supabase]);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (userIdRef.current) {
      supabase.from("entries").delete().eq("id", id).then(() => {});
    }
  }, [supabase]);

  const addBonusXp = useCallback((xp: number) => {
    setBonusXp((prev) => {
      const newVal = prev + xp;
      if (userIdRef.current) {
        supabase.from("profiles").update({ bonus_xp: newVal }).eq("id", userIdRef.current).then(() => {});
      }
      return newVal;
    });
  }, [supabase]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("logbook_password");
    window.location.href = "/login";
  }, [supabase]);

  const value: GameStateContextValue = {
    ready,
    displayName,
    characters,
    links,
    entries,
    totalXp,
    level,
    currentStreak,
    longestStreak,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    setLinks,
    addLink,
    removeLink,
    addEntry,
    updateEntryContent,
    deleteEntry,
    achievements,
    bonusXp,
    addBonusXp,
    logout,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}
