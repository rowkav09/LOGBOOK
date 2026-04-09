"use client";

import { useState } from "react";
import { useGameState } from "@/contexts/GameStateProvider";

export default function JournalPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [content, setContent] = useState("");
  const [xpFlash, setXpFlash] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const { entries, characters, addEntry, updateEntryContent, deleteEntry, ready } = useGameState();

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    const storedPassword = localStorage.getItem("logbook_password");
    if (storedPassword && password === storedPassword) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    const today = new Date().toISOString().split("T")[0];
    addEntry(content.trim(), today);
    setContent("");

    // Flash XP earned
    const mentionCount = characters.filter((c) => {
      const regex = new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      return regex.test(content);
    }).length;
    const xp = 50 + mentionCount * 10; // approximate
    setXpFlash(xp);
    setTimeout(() => setXpFlash(null), 2000);
  }

  if (!ready) return null;

  if (!unlocked) {
    return (
      <main className="min-h-screen px-4 py-6 md:p-8 flex items-center justify-center">
        <form onSubmit={handleUnlock} className="border border-border bg-surface p-6 md:p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-text-primary mb-2">Journal Locked</h1>
          <p className="text-sm text-text-muted mb-6">Enter the password to access your journal.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Password"
            autoComplete="off"
            name="journal-unlock"
            className="w-full bg-background border border-border px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
          {error && <p className="text-sm text-red-500 mt-2">Wrong password.</p>}
          <button
            type="submit"
            className="mt-4 w-full border border-accent text-accent px-4 py-3 font-semibold hover:bg-accent/5 transition-colors"
          >
            Unlock
          </button>
        </form>
      </main>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const todayEntry = entries.find((e) => e.date === today);
  const pastEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main className="min-h-screen px-4 py-6 md:p-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Journal</h1>

      <div className="max-w-2xl space-y-4 md:space-y-6">
        {/* Write today's entry */}
        {!todayEntry ? (
          <form onSubmit={handleSubmit} className="border border-accent bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary">Today &mdash; {today}</h2>
              {xpFlash !== null && (
                <span className="text-sm font-bold text-accent animate-pulse">+{xpFlash} XP</span>
              )}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened today? Mention character names to earn bonus XP..."
              rows={6}
              className="w-full bg-background border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none mb-4"
            />
            {characters.length > 0 && (
              <p className="text-xs text-text-muted mb-4">
                Characters: {characters.map((c) => c.name).join(", ")}
              </p>
            )}
            <button
              type="submit"
              disabled={!content.trim()}
              className="border border-accent text-accent px-4 py-2 text-sm font-semibold hover:bg-accent/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Log Entry
            </button>
          </form>
        ) : editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editContent.trim()) return;
              updateEntryContent(todayEntry.id, editContent.trim());
              setEditing(false);
            }}
            className="border border-accent bg-surface p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary">Editing &mdash; {today}</h2>
              <span className="text-xs text-text-muted">XP won&apos;t change</span>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              className="w-full bg-background border border-border px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!editContent.trim()}
                className="border border-accent text-accent px-4 py-2 text-sm font-semibold hover:bg-accent/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="border border-border text-text-muted px-4 py-2 text-sm hover:border-text-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">Today &mdash; {today}</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-accent">+{todayEntry.xpEarned} XP</span>
                <button
                  onClick={() => { setEditContent(todayEntry.content); setEditing(true); }}
                  className="text-xs text-text-muted hover:text-accent transition-colors"
                >
                  edit
                </button>
              </div>
            </div>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{todayEntry.content}</p>
            {todayEntry.mentionedCharacterIds.length > 0 && (
              <p className="text-xs text-text-muted mt-3">
                Mentioned: {todayEntry.mentionedCharacterIds
                  .map((id) => characters.find((c) => c.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Past entries */}
        {pastEntries.filter((e) => e.date !== today).map((entry) => (
          <div key={entry.id} className="border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">{entry.date}</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-accent">+{entry.xpEarned} XP</span>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-xs text-text-muted hover:text-red-500"
                >
                  delete
                </button>
              </div>
            </div>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{entry.content}</p>
            {entry.mentionedCharacterIds.length > 0 && (
              <p className="text-xs text-text-muted mt-3">
                Mentioned: {entry.mentionedCharacterIds
                  .map((id) => characters.find((c) => c.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
