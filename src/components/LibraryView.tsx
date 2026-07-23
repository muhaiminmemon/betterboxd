"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatTenths } from "@/lib/format";
import { posterUrl } from "@/lib/tmdb-urls";
import type { LibraryFilm } from "@/lib/library";

type Props = {
  films: LibraryFilm[];
  /** drag-to-reorder ties and edit links; false on public profiles */
  editable: boolean;
};

export default function LibraryView({ films, editable }: Props) {
  const [view, setView] = useState<"ledger" | "shelf">("ledger");
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState(films);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? items.filter((x) => x.title.toLowerCase().includes(f)) : items;
  }, [items, filter]);

  const rated = visible.filter((f) => f.rating !== null);
  const unrated = visible.filter((f) => f.rating === null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by title"
          aria-label="Filter library by title"
          className="w-44 rounded-card border border-seam bg-tray px-3 py-1.5 text-sm placeholder:text-ash focus:border-beam focus:outline-none"
        />
        <div className="ml-auto flex rounded-card border border-seam text-sm" role="group" aria-label="View">
          {(["ledger", "shelf"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 first:rounded-l-card last:rounded-r-card ${
                view === v ? "bg-tray-2 text-paper" : "text-ash hover:text-paper"
              }`}
            >
              {v === "ledger" ? "Ledger" : "Shelf"}
            </button>
          ))}
        </div>
      </div>

      {view === "ledger" ? (
        <Ledger
          rated={rated}
          unrated={unrated}
          editable={editable && !filter}
          onReorder={setItems}
          all={items}
        />
      ) : (
        <Shelf films={visible} />
      )}
    </div>
  );
}

function Ledger({
  rated,
  unrated,
  editable,
  onReorder,
  all,
}: {
  rated: LibraryFilm[];
  unrated: LibraryFilm[];
  editable: boolean;
  onReorder: (items: LibraryFilm[]) => void;
  all: LibraryFilm[];
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // tie groups: runs of equal ratings, in display order
  const groups = useMemo(() => {
    const out: LibraryFilm[][] = [];
    for (const f of rated) {
      const last = out[out.length - 1];
      if (last && last[0].rating === f.rating) last.push(f);
      else out.push([f]);
    }
    return out;
  }, [rated]);

  async function handleDragEnd(event: DragEndEvent, group: LibraryFilm[]) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = group.findIndex((f) => f.filmId === active.id);
    const newIndex = group.findIndex((f) => f.filmId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(group, oldIndex, newIndex);

    const next = [...all];
    const start = next.findIndex((f) => f.filmId === group[0].filmId);
    reordered.forEach((f, i) => (next[start + i] = f));
    onReorder(next);

    await fetch("/api/library/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedFilmIds: reordered.map((f) => f.filmId) }),
    });
  }

  let rank = 0;
  return (
    <ol className="fade-up">
      {groups.map((group) => {
        const tie = group.length > 1;
        const rows = group.map((film) => {
          rank += 1;
          return { film, rank };
        });
        const content = rows.map(({ film, rank }) => (
          <LedgerRow
            key={film.filmId}
            film={film}
            rank={rank}
            draggable={editable && tie}
          />
        ));
        return editable && tie ? (
          <DndContext
            key={group[0].filmId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, group)}
          >
            <SortableContext
              items={group.map((f) => f.filmId)}
              strategy={verticalListSortingStrategy}
            >
              {content}
            </SortableContext>
          </DndContext>
        ) : (
          content
        );
      })}
      {unrated.length > 0 && (
        <>
          <li className="mt-6 mb-2 text-xs uppercase tracking-wide text-ash" aria-hidden>
            Watched — no rating
          </li>
          {unrated.map((film) => (
            <LedgerRow key={film.filmId} film={film} rank={null} draggable={false} />
          ))}
        </>
      )}
    </ol>
  );
}

function LedgerRow({
  film,
  rank,
  draggable,
}: {
  film: LibraryFilm;
  rank: number | null;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: film.filmId,
    disabled: !draggable,
  });

  const poster = posterUrl(film.posterPath, "w154");

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-3 border-b border-seam py-2 ${
        isDragging ? "z-10 bg-tray-2 relative rounded-card" : ""
      }`}
    >
      <span className="num w-8 shrink-0 text-right text-xs text-ash">
        {rank ?? ""}
      </span>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={`Poster for ${film.title}`}
          loading="lazy"
          className="h-[60px] w-10 shrink-0 rounded-[3px] object-cover bg-tray"
        />
      ) : (
        <span className="h-[60px] w-10 shrink-0 rounded-[3px] bg-tray" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <Link href={`/film/${film.slug}`} className="block truncate text-paper hover:underline">
          {film.title}
        </Link>
        <span className="block truncate text-xs text-ash">
          {[film.year, film.director].filter(Boolean).join(" · ")}
          {film.entryCount > 1 ? ` · watched ${film.entryCount}×` : ""}
        </span>
      </span>
      {draggable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${film.title} within its rating group`}
          className="cursor-grab touch-none px-1 text-seam opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-ash active:cursor-grabbing"
        >
          ⠿
        </button>
      )}
      <span className="num w-12 shrink-0 text-right text-lg text-paper">
        {film.rating !== null ? formatTenths(film.rating) : ""}
      </span>
    </li>
  );
}

function Shelf({ films }: { films: LibraryFilm[] }) {
  return (
    <ul className="fade-up grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {films.map((film) => {
        const poster = posterUrl(film.posterPath, "w342");
        return (
          <li key={film.filmId}>
            <Link href={`/film/${film.slug}`} className="block">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poster}
                  alt={`Poster for ${film.title}`}
                  loading="lazy"
                  className="aspect-[2/3] w-full rounded-card object-cover bg-tray"
                />
              ) : (
                <span className="flex aspect-[2/3] w-full items-center justify-center rounded-card bg-tray p-2 text-center text-sm text-ash">
                  {film.title}
                </span>
              )}
              <span className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="truncate text-xs text-ash">{film.title}</span>
                <span className="num text-sm text-paper">
                  {film.rating !== null ? formatTenths(film.rating) : "—"}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
