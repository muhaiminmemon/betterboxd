"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { errorFrom } from "@/lib/http";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.toLowerCase(), email, password }),
      });
      if (!res.ok) {
        setError(await errorFrom(res, "Couldn't create your account. Try again."));
        return;
      }
      router.push(next && next.startsWith("/") ? next : "/import");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xs py-16">
      <h1 className="display text-2xl">Create your account</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm text-ash">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            minLength={2}
            maxLength={24}
            pattern="[a-zA-Z0-9][a-zA-Z0-9-]*"
            className="w-full rounded-card border border-seam bg-tray px-3 py-2 focus:border-beam focus:outline-none"
          />
          <span className="mt-1 block text-xs text-ash">
            Your profile lives at betterboxd.app/{username.toLowerCase() || "you"}
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ash">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
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
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-card border border-seam bg-tray px-3 py-2 focus:border-beam focus:outline-none"
          />
        </label>
        {error && <p className="text-sm text-warn">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-card bg-paper py-2 font-medium text-carbon hover:bg-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-ash">
        Already have one?{" "}
        <Link href="/login" className="text-paper underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
