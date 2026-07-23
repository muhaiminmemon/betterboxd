"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RatingDial from "./RatingDial";
import { formatTenths, todayLocalISO } from "@/lib/format";
import { errorFrom, readJson } from "@/lib/http";

type Entry = {
  id: string;
  watchedOn: string | null;
  rating: number | null;
  rewatch: boolean;
  hasReview: boolean;
  createdAt: string;
};

/** One heading style for every block in the panel. */
const SECTION = "mb-3 text-xs uppercase tracking-wide text-ash";

type Props = {
  filmId: string;
  entries: Entry[];
  /** id of the entry whose rating is current (most recent rated) */
  currentRatedEntryId: string | null;
  currentRating: number | null;
  inWatchlist: boolean;
  watchlistSource: string | null;
  lists: { id: string; title: string; hasFilm: boolean }[];
};

export default function FilmPanel({
  filmId,
  entries,
  currentRatedEntryId,
  currentRating,
  inWatchlist,
  watchlistSource,
  lists,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState<string>(todayLocalISO());
  const [logNoDate, setLogNoDate] = useState(false);
  const [logRating, setLogRating] = useState<number | null>(null);
  const [logReview, setLogReview] = useState("");
  const [logSpoiler, setLogSpoiler] = useState(false);
  const [logPrivate, setLogPrivate] = useState(false);
  // membership is server state; keep a local copy so a chip appears instantly
  const [listState, setListState] = useState(lists);
  const [prevLists, setPrevLists] = useState(lists);
  if (lists !== prevLists) {
    setPrevLists(lists);
    setListState(lists);
  }
  const [wl, setWl] = useState(inWatchlist);
  const [wlSource, setWlSource] = useState(watchlistSource ?? "");
  const [wlAskSource, setWlAskSource] = useState(false);

  // A second commit that lands before the first returns would create a
  // duplicate entry, and `busy` re-renders too late to stop it, so lock on a ref.
  const inFlight = useRef(false);
  // id of an entry this panel created before the server data caught up
  const createdIdRef = useRef<string | null>(null);

  async function request(fn: () => Promise<Response>): Promise<Response | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        setError(await errorFrom(res, "That didn't save. Try again."));
        return null;
      }
      return res;
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      return null;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  /** Refine the current rating in place, or create a first rating. */
  async function commitRating(tenths: number) {
    const ratedId = currentRatedEntryId ?? createdIdRef.current;
    if (ratedId) {
      const res = await request(() =>
        fetch(`/api/entries/${ratedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: tenths }),
        }),
      );
      if (res) router.refresh();
    } else {
      const res = await request(() =>
        fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmId, rating: tenths, watchedOn: null }),
        }),
      );
      if (!res) return;
      const data = await readJson<{ entry: { id: string } }>(res);
      if (data.entry?.id) createdIdRef.current = data.entry.id;
      router.refresh();
    }
  }

  /**
   * A dial-created rating (no date, no review, not a rewatch) is a
   * placeholder meaning "seen it, undated". Logging the viewing fills that
   * row in rather than adding a second one for the same watch.
   */
  const placeholder = entries.find(
    (e) => !e.watchedOn && e.rating !== null && !e.hasReview && !e.rewatch,
  );
  const priorViewings = entries.filter((e) => e.id !== placeholder?.id);
  const isRewatch = priorViewings.length > 0;

  async function logViewing() {
    const payload = {
      watchedOn: logNoDate ? null : logDate,
      rating: logRating,
      review: logReview.trim() || null,
      spoiler: logSpoiler,
      private: logPrivate,
      rewatch: isRewatch,
    };
    // only reuse the placeholder when it's the sole entry, so a genuine
    // rewatch never overwrites the viewing that came before it
    const target = isRewatch ? undefined : placeholder;

    const res = await request(() =>
      target
        ? fetch(`/api/entries/${target.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : fetch("/api/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filmId, ...payload }),
          }),
    );
    if (!res) return;

    // watching it settles the watchlist, since it's no longer something to get to
    if (wl) {
      await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId }),
      }).catch(() => {});
      setWl(false);
      setWlAskSource(false);
    }

    setLogOpen(false);
    setLogRating(null);
    setLogReview("");
    setLogSpoiler(false);
    setLogPrivate(false);
    router.refresh();
  }

  /** Choosing a list adds it straight away: no second button, no flash that reverts. */
  async function addToList(listId: string) {
    if (!listId) return;
    const res = await request(() =>
      fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId }),
      }),
    );
    if (!res) return;
    setListState((ls) => ls.map((l) => (l.id === listId ? { ...l, hasFilm: true } : l)));
    router.refresh();
  }

  async function removeFromList(listId: string) {
    const res = await request(() =>
      fetch(`/api/lists/${listId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId }),
      }),
    );
    if (!res) return;
    setListState((ls) => ls.map((l) => (l.id === listId ? { ...l, hasFilm: false } : l)));
    router.refresh();
  }

  async function toggleWatchlist() {
    if (wl) {
      const res = await request(() =>
        fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmId }),
        }),
      );
      if (!res) return;
      setWl(false);
      setWlAskSource(false);
      router.refresh();
    } else {
      const res = await request(() =>
        fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmId, source: wlSource || null }),
        }),
      );
      if (!res) return;
      setWl(true);
      setWlAskSource(true);
      router.refresh();
    }
  }

  async function saveWlSource() {
    const res = await request(() =>
      fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId, source: wlSource || null }),
      }),
    );
    if (!res) return;
    setWlAskSource(false);
    router.refresh();
  }

  const inLists = listState.filter((l) => l.hasFilm);
  const availableLists = listState.filter((l) => !l.hasFilm);

  return (
    <div className="max-w-md space-y-8">
      <section>
        <h2 className={SECTION}>Your rating</h2>
        <RatingDial value={currentRating} onCommit={commitRating} busy={busy} />
        {currentRatedEntryId && (
          <p className="mt-2 text-xs leading-relaxed text-ash">
            Changing this refines your current rating. Logging a new viewing keeps history.
          </p>
        )}
      </section>

      <section>
        <h2 className={SECTION}>Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLogOpen((o) => !o)}
            aria-expanded={logOpen}
            className={`rounded-card px-4 py-2 text-sm font-medium transition-colors ${
              logOpen
                ? "border border-seam bg-tray-2 text-paper"
                : "bg-paper text-carbon hover:bg-white"
            }`}
          >
            {logOpen ? "Cancel" : isRewatch ? "Log a rewatch" : "Log a viewing"}
          </button>
          <button
            type="button"
            onClick={toggleWatchlist}
            disabled={busy}
            aria-pressed={wl}
            className={`rounded-card border px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
              wl
                ? "border-seam bg-tray text-paper hover:bg-tray-2"
                : "border-seam text-ash hover:text-paper"
            }`}
          >
            {wl ? "✓ On your watchlist" : "Add to watchlist"}
          </button>
        </div>

        {wl && wlAskSource && (
          <div className="mt-3 rounded-card border border-seam bg-tray p-3">
            <label htmlFor="wl-source" className="mb-1.5 block text-xs text-ash">
              Where did this come from? (optional)
            </label>
            <div className="flex gap-2">
              <input
                id="wl-source"
                value={wlSource}
                onChange={(e) => setWlSource(e.target.value)}
                placeholder="Who recommended it, or where you saw it"
                className="min-w-0 flex-1 rounded-card border border-seam bg-carbon px-3 py-1.5 text-sm placeholder:text-ash focus:border-beam focus:outline-none"
              />
              <button
                type="button"
                onClick={saveWlSource}
                disabled={busy}
                className="shrink-0 rounded-card border border-seam px-3 py-1.5 text-sm text-paper hover:bg-tray-2 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {logOpen && (
          <div className="fade-up mt-3 rounded-card border border-seam bg-tray p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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

            <div className="mt-4 border-t border-seam pt-4">
              <span className="mb-2 block text-sm text-ash">Rating (optional)</span>
              <RatingDial value={logRating} onCommit={setLogRating} />
              {logRating !== null && (
                <button
                  type="button"
                  onClick={() => setLogRating(null)}
                  className="mt-2 text-xs text-ash hover:text-paper"
                >
                  Clear rating
                </button>
              )}
            </div>

            <div className="mt-4 border-t border-seam pt-4">
              <label htmlFor="log-review" className="mb-1.5 block text-sm text-ash">
                Review (optional)
              </label>
              <textarea
                id="log-review"
                value={logReview}
                onChange={(e) => setLogReview(e.target.value)}
                rows={3}
                maxLength={20000}
                className="w-full rounded-card border border-seam bg-carbon px-3 py-2 text-sm focus:border-beam focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ash">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={logSpoiler}
                    onChange={(e) => setLogSpoiler(e.target.checked)}
                  />
                  Mentions plot details
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={logPrivate}
                    onChange={(e) => setLogPrivate(e.target.checked)}
                  />
                  Only me
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={logViewing}
              disabled={busy}
              className="mt-4 w-full rounded-card bg-paper py-2 text-sm font-medium text-carbon hover:bg-white disabled:opacity-50"
            >
              {busy
                ? "Saving…"
                : logRating !== null
                  ? `Log · ${formatTenths(logRating)}`
                  : "Log without a rating"}
            </button>
          </div>
        )}
      </section>

      {listState.length > 0 && (
        <section>
          <h2 className={SECTION}>Lists</h2>
          {inLists.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {inLists.map((l) => (
                <li key={l.id}>
                  <span className="flex items-center gap-1.5 rounded-card border border-seam bg-tray py-1 pl-3 pr-1.5 text-sm">
                    <Link href={`/lists/${l.id}`} className="text-paper hover:underline">
                      {l.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromList(l.id)}
                      disabled={busy}
                      aria-label={`Remove from ${l.title}`}
                      className="rounded px-1 leading-none text-ash hover:text-warn disabled:opacity-50"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {availableLists.length > 0 ? (
            <select
              value=""
              disabled={busy}
              onChange={(e) => addToList(e.target.value)}
              aria-label="Add to a list"
              className="rounded-card border border-seam bg-tray px-3 py-1.5 text-sm text-ash disabled:opacity-50"
            >
              <option value="">Add to a list…</option>
              {availableLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-ash">It&apos;s in every list you can edit.</p>
          )}
        </section>
      )}

      {entries.length > 0 && (
        <section>
          <h2 className={SECTION}>Viewings</h2>
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
  const [rowError, setRowError] = useState<string | null>(null);

  async function saveDate() {
    setRowError(null);
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchedOn: date || null }),
    }).catch(() => null);
    if (!res?.ok) {
      setRowError(res ? await errorFrom(res, "Couldn't change that date.") : "Couldn't reach the server.");
      return;
    }
    setEditingDate(false);
    onChange();
  }

  async function remove() {
    setRowError(null);
    const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setRowError(res ? await errorFrom(res, "Couldn't delete that viewing.") : "Couldn't reach the server.");
      return;
    }
    onChange();
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-2 text-sm">
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
        {entry.rating !== null ? formatTenths(entry.rating) : ""}
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
      {rowError && <span className="w-full text-xs text-warn">{rowError}</span>}
    </li>
  );
}
