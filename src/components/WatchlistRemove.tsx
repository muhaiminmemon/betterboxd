"use client";

import { useRouter } from "next/navigation";

export default function WatchlistRemove({ filmId, title }: { filmId: string; title: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={`Remove ${title} from watchlist`}
      onClick={async () => {
        await fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmId }),
        });
        router.refresh();
      }}
      className="text-sm text-ash hover:text-warn"
    >
      Remove
    </button>
  );
}
