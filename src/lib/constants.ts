export const CHARACTER_TYPES = {
  ALLY: { label: "Ally", color: "#c8f135", description: "Close friends, ride or dies — the people you trust completely" },
  CONTACT: { label: "Contact", color: "#ffffff", description: "Acquaintances, useful connections — people you know but aren't close to" },
  RIVAL: { label: "Rival", color: "#ff4444", description: "Competitive relationships, frenemies — they push you or get under your skin" },
  MENTOR: { label: "Mentor", color: "#44aaff", description: "Someone you learn from — they've shaped how you think or move" },
  CREW: { label: "Crew", color: "#ff9f1a", description: "Your regular group — the people you move with day to day" },
  GHOST: { label: "Ghost", color: "#444444", description: "Someone who used to be in your life but has drifted away" },
} as const;

export type CharacterType = keyof typeof CHARACTER_TYPES;

export const LABELS = ["none", "crush", "ex", "situationship", "family", "coworker", "roommate"] as const;
export type CharacterLabel = typeof LABELS[number];
