"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RatingDial from "./RatingDial";
import { formatTenths } from "@/lib/format";

type Entry = {
  id: string;
  watchedOn: string | null;
  rating: number | null;
  rewatch: boolean;
  createdAt: string;
};

type Props = {
  filmId: string;
  entries: Entry[];
  /** id of the entry whose rating is current (most recent rated) */
  currentRatedEntryId: string | null;
  currentRating: number | null;
  inWatchlist: boolean;
  watchlistSource: string | null;
};

export default function FilmPanel({
  filmId,
  entries,
  currentRatedEntryId,
  currentRating,
  inWatchlist,
  watchlistSource,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [logNoDate, setLogNoDate] = useState(false);
  const [logRating, setLogRating] = useState<number | null>(null);
  const [wl, setWl] = useState(inWatchlist);
  const [wlSource, setWlSource] = useState(watchlistSource ?? "");
  const [wlAskSource, setWlAskSource] = useState(false);

  async function call(fn: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "That didn't save. Try again.");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  /** Refine the current rating in place, or create a first rating. */
  async function commitRating(tenths: number | null) {
    if (currentRatedEntryId) {
      await call(() =>
        fetch(`/api/entries/${currentRatedEntryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: tenths }),
        }),
      );
    } else if (tenths !== null) {
      await call(() =>
        fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmId, rating: tenths, watchedOn: null }),
        }),
      );
    }
  }

  async function logViewing() {
    const ok = await call(() =>
      fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filmId,
          watchedOn: logNoDate ? null : logDate,
          rating: logRating,
          rewatch: entries.length > 0,
        }),
      }),
    );
    if (ok) {
      setLogOpen(false);
      setLogRating(null);
    }
  }

  async function toggleWatchlist() {
    if (wl) {
      const ok = await call(() =>
        fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmId }),
        }),
      );
      if (ok) {
        setWl(false);
        setWlAskSource(false);
      }
    } else {
      const ok = await call(() =>
        fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmId, source: wlSource || null }),
        }),
      );
      if (ok) {
        setWl(true);
        setWlAskSource(true);
      }
    }
  }

  async function saveWlSource() {
    const ok = await call(() =>
      fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId, source: wlSource || null }),
      }),
    );
    if (ok) setWlAskSource(false);
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs uppercase tracking-wide text-ash">Your rating</h2>
        <RatingDial value={currentRating} onCommit={commitRating} busy={busy} />
        {currentRatedEntryId && (
          <p className="mt-2 text-xs text-ash">
            Changing this refines your current rating. Logging a new viewing keeps history.
          </p>
        )}
      </section>

      <section className="flex flex-wrap items-center gap-3">
        {!logOpen ? (
          <>
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="rounded-card bg-paper px-4 py-1.5 text-sm font-medium text-carbon hover:bg-white"
            >
              Log a viewing
            </button>
            <button
              type="button"
              onClick={toggleWatchlist}
              disabled={busy}
              className="rounded-card border border-seam px-4 py-1.5 text-sm text-ash hover:text-paper disabled:opacity-50"
            >
              {wl ? "Remove from watchlist" : "Add to watchlist"}
            </button>
          </>
        ) : (
          <div className="w-full max-w-sm rounded-card border border-seam bg-tray p-4">
            <div className="flex items-center gap-3">
              <label htmlFor="log-date" className="text-sm text-ash">
                Watched on
              </label>
              <input
                id="log-date"
                type="date"
                value={logDate}
                disabled={logNoDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="rounded-card border border-seam bg-carbon px-2 py-1 text-sm disabled:opacity-40"
              />
              <label className="flex items-center gap-1.5 text-sm text-ash">
                <input
                  type="checkbox"
                  checked={logNoDate}
                  onChange={(e) => setLogNoDate(e.target.checked)}
                />
                No date
              </label>
            </div>
            <div className="mt-3">
              <span className="mb-1 block text-sm text-ash">Rating — optional</span>
              <RatingDial value={logRating} onCommit={setLogRating} allowNoRating={false} />
              {logRating !== null && (
                <button
                  type="button"
                  onClick={() => setLogRating(null)}
                  className="mt-1 text-xs text-ash hover:text-paper"
                >
                  Log without a rating
                </button>
              )}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={logViewing}
                disabled={busy}
                className="rounded-card bg-paper px-4 py-1.5 text-sm font-medium text-carbon hover:bg-white disabled:opacity-50"
              >
                {logRating !== null ? `Log · ${formatTenths(logRating)}` : "Log — no rating"}
              </button>
              <button
                type="button"
                onClick={() => setLogOpen(false)}
                className="text-sm text-ash hover:text-paper"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {wlAskSource && (
          <div className="flex w-full max-w-sm items-center gap-2">
            <input
              value={wlSource}
              onChange={(e) => setWlSource(e.target.value)}
              placeholder="Who recommended it, or where you saw it"
              aria-label="Where this recommendation came from"
              className="min-w-0 flex-1 rounded-card border border-seam bg-tray px-3 py-1.5 text-sm placeholder:text-ash focus:border-beam focus:outline-none"
            />
            <button type="button" onClick={saveWlSource} className="text-sm text-ash hover:text-paper">
              Save
            </button>
          </div>
        )}
      </section>

      {entries.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs uppercase tracking-wide text-ash">Viewings</h2>
          <ul className="divide-y divide-seam border-y border-seam">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} busy={busy} onChange={() => router.refresh()} />
            ))}
          </ul>
        </section>
      )}

      {error && <p className="text-sm text-warn">{error}</p>}
    </div>
  );
}

function EntryRow({
  entry,
  busy,
  onChange,
}: {
  entry: Entry;
  busy: boolean;
  onChange: () => void;
}) {
  const [editingDate, setEditingDate] = useState(false);
  const [date, setDate] = useState(entry.watchedOn ?? "");
  const [confirming, setConfirming] = useState(false);

  async function saveDate() {
    await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchedOn: date || null }),
    });
    setEditingDate(false);
    onChange();
  }

  async function remove() {
    await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      {editingDate ? (
        <span className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-card border border-seam bg-tray px-2 py-0.5"
          />
          <button type="button" onClick={saveDate} className="text-ash hover:text-paper">
            Save
          </button>
          <button type="button" onClick={() => setEditingDate(false)} className="text-ash hover:text-paper">
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setEditingDate(true)}
          className="num text-ash hover:text-paper hover:underline"
          title="Edit date"
        >
          {entry.watchedOn ?? "No date"}
        </button>
      )}
      {entry.rewatch && <span className="text-xs text-ash">rewatch</span>}
      <span className="num ml-auto text-paper">
        {entry.rating !== null ? formatTenths(entry.rating) : "—"}
      </span>
      {confirming ? (
        <span className="flex items-center gap-2">
          <button type="button" onClick={remove} disabled={busy} className="text-warn">
            Delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-ash">
            Keep
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="Delete this viewing"
          className="text-ash hover:text-warn"
        >
          ×
        </button>
      )}
    </li>
  );
}
