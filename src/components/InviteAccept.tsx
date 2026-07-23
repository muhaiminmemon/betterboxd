"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteAccept({
  token,
  friendUsername,
}: {
  token: string;
  friendUsername: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push(`/${friendUsername}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="rounded-card bg-paper px-5 py-2 font-medium text-carbon hover:bg-white disabled:opacity-50"
      >
        {busy ? "Accepting…" : "Accept"}
      </button>
      {error && <p className="mt-3 text-sm text-warn">{error}</p>}
    </div>
  );
}
