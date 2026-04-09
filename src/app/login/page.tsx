"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    console.log("[Logbook] login result:", data?.session ? "SESSION OK" : "NO SESSION", error?.message || "");

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Verify session was stored
    const { data: check } = await supabase.auth.getSession();
    console.log("[Logbook] session after login:", check.session ? "EXISTS" : "NULL");

    localStorage.setItem("logbook_password", password);
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: "#0a0a0a" }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text-primary mb-1">
          Log<span className="text-accent">book</span>
        </h1>
        <p className="text-sm text-text-muted mb-8">Sign in to continue</p>

        <label className="block text-xs text-text-muted mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-[#0a0a0a] border border-[#1f1f1f] px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent mb-4"
          placeholder="you@email.com"
        />

        <label className="block text-xs text-text-muted mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-[#0a0a0a] border border-[#1f1f1f] px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent mb-6"
          placeholder="Password"
        />

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-[#0a0a0a] px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-sm text-text-muted mt-6 text-center">
          No account?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </main>
  );
}
