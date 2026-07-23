"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push("/library");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xs py-16">
      <h1 className="display text-2xl">Sign in</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm text-ash">Username or email</span>
          <input
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            autoComplete="username"
            required
            className="w-full rounded-card border border-seam bg-tray px-3 py-2 focus:border-beam focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ash">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-card border border-seam bg-tray px-3 py-2 focus:border-beam focus:outline-none"
          />
        </label>
        {error && <p className="text-sm text-warn">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-card bg-paper py-2 font-medium text-carbon hover:bg-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-ash">
        New here?{" "}
        <Link href="/signup" className="text-paper underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
