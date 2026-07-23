import { sql } from "drizzle-orm";
import { db } from "@/db";

export type LibraryFilm = {
  filmId: string;
  slug: string;
  title: string;
  year: number | null;
  posterPath: string | null;
  director: string | null;
  /** tenths, from the most recent *rated* entry; null = watched, never rated */
  rating: number | null;
  entryCount: number;
  lastWatched: string | null;
  sortKey: number;
};

/**
 * Ranked library. A film's current rating comes from its most recent rated
 * entry, so an unrated later viewing never erases the last actual rating.
 * Equal ratings keep the user's manual order (sort_key), then title.
 */
export async function getRankedLibrary(
  userId: string,
  { includePrivate = true }: { includePrivate?: boolean } = {},
): Promise<LibraryFilm[]> {
  const privacyFilter = includePrivate ? sql`true` : sql`private = false`;
  const rows = await db.execute(sql`
    with rated as (
      select distinct on (film_id)
        film_id, rating
      from diary_entries
      where user_id = ${userId} and rating is not null and ${privacyFilter}
      order by film_id, watched_on desc nulls last, created_at desc
    ),
    stats as (
      select film_id, count(*)::int as entry_count, max(watched_on) as last_watched
      from diary_entries
      where user_id = ${userId} and ${privacyFilter}
      group by film_id
    )
    select
      f.id as film_id,
      f.slug,
      f.title,
      f.year,
      f.poster_path,
      f.director,
      r.rating,
      s.entry_count,
      s.last_watched,
      coalesce(o.sort_key, 0) as sort_key
    from stats s
    join films f on f.id = s.film_id
    left join rated r on r.film_id = s.film_id
    left join library_order o on o.user_id = ${userId} and o.film_id = s.film_id
    order by r.rating desc nulls last, coalesce(o.sort_key, 0) asc, f.title asc
  `);

  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    filmId: r.film_id as string,
    slug: r.slug as string,
    title: r.title as string,
    year: r.year as number | null,
    posterPath: r.poster_path as string | null,
    director: r.director as string | null,
    rating: r.rating as number | null,
    entryCount: r.entry_count as number,
    lastWatched: r.last_watched as string | null,
    sortKey: r.sort_key as number,
  }));
}

export { formatTenths } from "./format";
