"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import LogSheet, { type LogPayload } from "./LogSheet";
import { useToast } from "./Toast";
import { formatTenths } from "@/lib/format";
import { errorFrom } from "@/lib/http";
import { posterUrl } from "@/lib/tmdb-urls";

export type Priority = "urgent" | "soon" | "whenever";

export type QueueItem = {
  filmId: string;
  slug: string;
  title: string;
  year: number | null;
  director: string | null;
  posterPath: string | null;
  source: string | null;
  priority: Priority;
};

const PRIORITY: Record<Priority, { label: string; dot: string; next: Priority }> = {
  urgent: { label: "Urgent", dot: "bg-warn", next: "soon" },
  soon: { label: "Soon", dot: "bg-gold", next: "whenever" },
  whenever: { label: "Whenever", dot: "bg-seam", next: "urgent" },
};

/**
 * Sources get a stable colour so the same recommender looks the same every
 * time, without anyone having to pick one.
 */
const TAG_COLORS = [
  "border-[#34506a] bg-[#161d24] text-beam",
  "border-[#4a3a24] bg-[#241d16] text-gold",
  "border-[#2c4a2c] bg-[#16241a] text-good",
  "border-[#4a2c33] bg-[#241619] text-warn",
  "border-[#3a3358] bg-[#1b1a2b] text-[#a99ad9]",
];

function tagClass(source: string): string {
  let h = 0;
  for (let i = 0; i < source.length; i++) h = (h * 31 + source.charCodeAt(i)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length];
}

export default function WatchlistQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState(items);
  const [prev, setPrev] = useState(items);
  if (items !== prev) {
    setPrev(items);
    setRows(items);
  }

  const [rating, setRating] = useState<QueueItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupBySource, setGroupBySource] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((r) => r.filmId === active.id);
    const to = rows.findIndex((r) => r.filmId === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(rows, from, to);
    setRows(next);
    await fetch("/api/watchlist/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedFilmIds: next.map((r) => r.filmId) }),
    }).catch(() => {});
  }

  async function cyclePriority(item: QueueItem) {
    const next = PRIORITY[item.priority].next;
    setRows((list) =>
      list.map((r) => (r.filmId === item.filmId ? { ...r, priority: next } : r)),
    );
    await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filmId: item.filmId, priority: next }),
    }).catch(() => {
      setRows((list) =>
        list.map((r) => (r.filmId === item.filmId ? { ...r, priority: item.priority } : r)),
      );
    });
  }

  async function remove(item: QueueItem) {
    setRows((list) => list.filter((r) => r.filmId !== item.filmId));
    const res = await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filmId: item.filmId }),
    }).catch(() => null);
    if (!res?.ok) {
      setRows(items);
      toast({ message: "Couldn't remove that.", tone: "warn" });
      return;
    }
    toast({ message: `Removed ${item.title}` });
    router.refresh();
  }

  /** Rating from here means you've watched it, so it moves to the diary. */
  async function logIt(payload: LogPayload) {
    if (!rating) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId: rating.filmId, ...payload }),
      });
      if (!res.ok) {
        setError(await errorFrom(res, "That didn't save. Try again."));
        return;
      }
      await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId: rating.filmId }),
      }).catch(() => {});

      setRows((list) => list.filter((r) => r.filmId !== rating.filmId));
      toast({
        message: (
          <>
            Moved <b>{rating.title}</b> to your diary
            {payload.rating !== null && (
              <>
                {" · "}
                <span className="num text-gold">{formatTenths(payload.rating)}</span>
              </>
            )}
          </>
        ),
        action: { label: "View in diary", href: "/diary" },
      });
      setRating(null);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const groups = useMemo(() => {
    if (!groupBySource) return [{ label: null as string | null, items: rows }];
    const map = new Map<string, QueueItem[]>();
    for (const r of rows) {
      const key = r.source?.trim() || "No source";
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([label, items]) => ({ label, items }));
  }, [rows, groupBySource]);

  const hasSources = rows.some((r) => r.source?.trim());

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="num text-xs text-ash">
          {rows.length} {rows.length === 1 ? "film" : "films"}
        </span>
        {hasSources && (
          <button
            type="button"
            onClick={() => setGroupBySource((g) => !g)}
            aria-pressed={groupBySource}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              groupBySource
                ? "border-paper bg-paper text-carbon"
                : "border-seam bg-tray text-ash hover:text-paper"
            }`}
          >
            Group by source
          </button>
        )}
        <span className="ml-auto hidden text-xs text-dim sm:inline">
          Drag to reorder · tap a dot to change priority
        </span>
      </div>

      {groups.map((group) => (
        <section key={group.label ?? "all"} className="mb-6 last:mb-0">
          {group.label && (
            <h2 className="mb-2 text-[11px] uppercase tracking-[0.14em] text-ash">
              {group.label}
            </h2>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={group.items.map((r) => r.filmId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <QueueRow
                    key={item.filmId}
                    item={item}
                    sortable={!groupBySource}
                    onCyclePriority={() => cyclePriority(item)}
                    onRate={() => setRating(item)}
                    onRemove={() => remove(item)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </section>
      ))}

      {rating && (
        <LogSheet
          open
          onClose={() => setRating(null)}
          film={rating}
          isRewatch={false}
          busy={busy}
          error={error}
          onSubmit={logIt}
        />
      )}
    </div>
  );
}

function QueueRow({
  item,
  sortable,
  onCyclePriority,
  onRate,
  onRemove,
}: {
  item: QueueItem;
  sortable: boolean;
  onCyclePriority: () => void;
  onRate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.filmId,
    disabled: !sortable,
  });
  const poster = posterUrl(item.posterPath, "w154");
  const p = PRIORITY[item.priority];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-3 rounded-lg border border-seam bg-lift p-2.5 ${
        isDragging ? "relative z-10 bg-tray-2" : ""
      }`}
    >
      <button
        type="button"
        onClick={onCyclePriority}
        aria-label={`Priority: ${p.label}. Change it.`}
        title={`Priority: ${p.label}`}
        className="flex size-5 shrink-0 items-center justify-center"
      >
        <span className={`size-2.5 rounded-full ${p.dot}`} />
      </button>

      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          loading="lazy"
          className="h-[66px] w-11 shrink-0 rounded-[4px] bg-tray object-cover"
        />
      ) : (
        <span className="h-[66px] w-11 shrink-0 rounded-[4px] bg-tray" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <Link href={`/film/${item.slug}`} className="block truncate text-paper hover:underline">
          {item.title} <span className="num text-xs text-ash">{item.year ?? ""}</span>
        </Link>
        {item.director && (
          <span className="block truncate text-xs text-dim">{item.director}</span>
        )}
        {item.source && (
          <span
            className={`mt-1 inline-block rounded-full border px-2 py-px text-[11px] ${tagClass(
              item.source,
            )}`}
          >
            {item.source}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onRate}
          className="rounded-card border border-seam bg-tray px-2.5 py-1.5 text-xs text-paper hover:bg-tray-2"
        >
          Watched it
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.title} from watchlist`}
          className="px-1.5 text-ash hover:text-warn"
        >
          ×
        </button>
        {sortable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${item.title}`}
            className="cursor-grab touch-none px-1 text-seam transition-opacity hover:text-ash focus-visible:opacity-100 active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-100"
          >
            ⠿
          </button>
        )}
      </div>
    </li>
  );
}
