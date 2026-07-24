"use client";

import { useRef, useState } from "react";
import { formatTenths, ratingColor } from "@/lib/format";

export type Viewing = {
  id: string;
  watchedOn: string | null;
  rating: number | null;
  rewatch: boolean;
  review: string | null;
  spoiler: boolean;
  private: boolean;
  createdAt: string;
};

type Props = {
  viewing: Viewing;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

/** width of the two revealed action buttons, in px */
const REVEAL = 112;

function dateLabel(v: Viewing): string {
  if (!v.watchedOn) return "No date";
  const [y, m, d] = v.watchedOn.split("-").map(Number);
  const when = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - when.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return when.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: when.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

/**
 * A viewing you can read at a glance. Actions sit inline from `sm` up; on touch
 * they hide behind a left swipe so the card stays uncluttered.
 */
export default function ViewingCard({ viewing, busy, onEdit, onDelete }: Props) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return;
    startX.current = e.clientX;
    dragging.current = true;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || startX.current === null) return;
    const delta = e.clientX - startX.current + (dx === -REVEAL ? -REVEAL : 0);
    setDx(Math.max(-REVEAL, Math.min(0, delta)));
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    startX.current = null;
    // snap to whichever end is nearer
    setDx((x) => (x < -REVEAL / 2 ? -REVEAL : 0));
  }

  return (
    <li className="relative overflow-hidden rounded-lg">
      {/* revealed by the swipe; inert until the card is dragged aside */}
      <div className="absolute inset-0 flex justify-end sm:hidden" aria-hidden={dx === 0}>
        <button
          type="button"
          tabIndex={-1}
          onClick={onEdit}
          disabled={busy}
          className="w-14 bg-[#2c2431] text-xs text-beam"
        >
          Edit
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={onDelete}
          disabled={busy}
          className="w-14 bg-[#3a2422] text-xs text-warn"
        >
          Delete
        </button>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${dx}px)` }}
        className="relative flex items-start gap-3.5 rounded-lg border border-seam bg-lift px-3.5 py-3 transition-transform"
      >
        <div className="w-11 shrink-0 text-center">
          <span className={`num text-[19px] ${ratingColor(viewing.rating)}`}>
            {viewing.rating === null ? "" : formatTenths(viewing.rating)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-[13px] text-paper">{dateLabel(viewing)}</span>
            {viewing.rewatch && (
              <span className="rounded-full border border-beam-edge px-1.5 py-px text-[11px] text-beam">
                rewatch
              </span>
            )}
            {viewing.private && (
              <span className="rounded-full border border-seam px-1.5 py-px text-[11px] text-dim">
                only me
              </span>
            )}
          </div>
          {viewing.review && (
            <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-ash">
              {viewing.spoiler ? "Mentions plot details." : viewing.review}
            </p>
          )}
        </div>

        <div className="hidden shrink-0 gap-3 text-xs text-ash sm:flex">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="hover:text-paper disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="hover:text-warn disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
