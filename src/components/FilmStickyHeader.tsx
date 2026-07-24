"use client";

import { useEffect, useRef, useState } from "react";
import { formatTenths, ratingColor } from "@/lib/format";

type Props = {
  title: string;
  meta: string;
  rating: number | null;
};

/**
 * The essentials follow you down the page. It only appears once the real title
 * has scrolled away, so the top of the page is never doubled up.
 */
export default function FilmStickyHeader({ title, meta, rating }: Props) {
  const [shown, setShown] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting), {
      rootMargin: "-64px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        aria-hidden={!shown}
        className={`fixed inset-x-0 top-0 z-30 border-b border-seam bg-[rgba(20,20,23,.92)] backdrop-blur transition-opacity ${
          shown ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="display truncate text-[17px] text-paper">{title}</span>
            <span className="num hidden shrink-0 text-[13px] text-ash sm:inline">{meta}</span>
          </div>
          {rating !== null && (
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden text-[11px] uppercase tracking-[0.12em] text-ash sm:inline">
                Your rating
              </span>
              <span className={`num text-[22px] ${ratingColor(rating)}`}>
                {formatTenths(rating)}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
