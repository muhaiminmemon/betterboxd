import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { films } from "@/db/schema";
import { releaseYear, searchMovies, TmdbError } from "@/lib/tmdb";

export type SearchResult = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
};

/** TMDB search merged with the local catalogue (pg_trgm handles typos). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const results: SearchResult[] = [];
  const seen = new Set<number>();

  try {
    for (const m of (await searchMovies(q)).slice(0, 12)) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      results.push({
        tmdbId: m.id,
        title: m.title,
        year: releaseYear(m),
        posterPath: m.poster_path ?? null,
      });
    }
  } catch (e) {
    if (!(e instanceof TmdbError)) throw e;
    // fall back to the local catalogue only
  }

  try {
    const local = await db
      .select({
        tmdbId: films.tmdbId,
        title: films.title,
        year: films.year,
        posterPath: films.posterPath,
      })
      .from(films)
      .where(sql`similarity(${films.title}, ${q}) > 0.3`)
      .orderBy(sql`similarity(${films.title}, ${q}) desc`)
      .limit(8);
    for (const f of local) {
      if (f.tmdbId === null || seen.has(f.tmdbId)) continue;
      seen.add(f.tmdbId);
      results.push({ tmdbId: f.tmdbId, title: f.title, year: f.year, posterPath: f.posterPath });
    }
  } catch {
    // pg_trgm not installed yet, so TMDB results alone are fine
  }

  return NextResponse.json({ results: results.slice(0, 12) });
}
