"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorFrom } from "@/lib/http";

export default function WatchlistRemove({ filmId, title }: { filmId: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId }),
      });
      if (!res.ok) {
        setError(await errorFrom(res, "Couldn't remove that."));
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="text-right">
      <button
        type="button"
        aria-label={`Remove ${title} from watchlist`}
        onClick={remove}
        disabled={busy}
        className="text-sm text-ash hover:text-warn disabled:opacity-50"
      >
        Remove
      </button>
      {error && <span className="block text-xs text-warn">{error}</span>}
    </span>
  );
}
