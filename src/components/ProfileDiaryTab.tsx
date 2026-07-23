"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProfileDiaryList, { type ProfileDiaryRow } from "./ProfileDiaryList";

type SortMode = "newest" | "oldest" | "rating-desc" | "rating-asc" | "title";

const SORT_LABELS: Record<SortMode, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  "rating-desc": "Rating — high to low",
  "rating-asc": "Rating — low to high",
  title: "Title A–Z",
};

export default function ProfileDiaryTab({
  rows,
  editable,
}: {
  rows: ProfileDiaryRow[];
  editable: boolean;
}) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let out = q ? rows.filter((r) => r.title.toLowerCase().includes(q)) : rows;
    if (sort !== "newest") {
      out = [...out].sort((a, b) => {
        switch (sort) {
          case "oldest":
            return (a.watchedOn ?? "").localeCompare(b.watchedOn ?? "");
          case "rating-desc":
            return (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title);
          case "rating-asc":
            return (a.rating ?? 999) - (b.rating ?? 999) || a.title.localeCompare(b.title);
          case "title":
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
    }
    return out;
  }, [rows, filter, sort]);

  if (rows.length === 0) {
    return <p className="py-8 text-sm text-ash">Nothing logged yet.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter title"
          aria-label="Filter diary"
          className="w-48 rounded-card border border-seam bg-tray px-3 py-1.5 text-sm placeholder:text-ash focus:border-beam focus:outline-none"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort diary by"
          className="rounded-card border border-seam bg-tray px-2 py-1.5 text-sm text-paper"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {editable && (
          <Link href="/diary" className="ml-auto text-sm text-ash hover:text-paper">
            Edit entries
          </Link>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="py-8 text-sm text-ash">No entries match that filter.</p>
      ) : (
        <ProfileDiaryList rows={visible} />
      )}
    </div>
  );
}
