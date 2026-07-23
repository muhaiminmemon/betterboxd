"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { posterUrl } from "@/lib/tmdb-urls";

type Result = { tmdbId: number; title: string; year: number | null; posterPath: string | null };

export default function SearchBox() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    const t = setTimeout(async () => {
      if (!query) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Find a film"
        aria-label="Find a film"
        className="w-40 sm:w-56 rounded-card border border-seam bg-tray px-3 py-1.5 text-sm placeholder:text-ash focus:border-beam focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute right-0 z-30 mt-1 w-72 overflow-hidden rounded-card border border-seam bg-tray shadow-lg">
          {results.slice(0, 8).map((r) => {
            const poster = posterUrl(r.posterPath, "w154");
            return (
              <li key={r.tmdbId}>
                <Link
                  href={`/film/t/${r.tmdbId}`}
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                  }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-tray-2"
                >
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster} alt="" className="h-12 w-8 rounded-[3px] object-cover bg-carbon" />
                  ) : (
                    <span className="h-12 w-8 rounded-[3px] bg-carbon" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-paper">{r.title}</span>
                    <span className="num block text-xs text-ash">{r.year ?? ""}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
