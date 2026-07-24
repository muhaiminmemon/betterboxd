import { sql } from "drizzle-orm";
import { db } from "@/db";
import { topMoviesOfYear } from "./tmdb";

export type WallPoster = {
  posterPath: string;
  title: string;
  /** community mean in tenths, or null when nobody here has rated it yet */
  rating: number | null;
};

/** Community mean per film, for whichever of these we already hold locally. */
async function communityMeans(tmdbIds: number[]): Promise<Map<number, number>> {
  if (!tmdbIds.length) return new Map();
  const rows = await db.execute(sql`
    with current as (
      select distinct on (d.user_id, d.film_id) d.user_id, d.film_id, d.rating
      from diary_entries d
      where d.rating is not null and d.private = false
      order by d.user_id, d.film_id, d.watched_on desc nulls last, d.created_at desc
    )
    select f.tmdb_id, avg(c.rating)::float as mean
    from current c
    join films f on f.id = c.film_id
    where f.tmdb_id in (${sql.join(tmdbIds.map((id) => sql`${id}`), sql`, `)})
    group by f.tmdb_id
  `);
  return new Map(
    (rows as unknown as Record<string, unknown>[]).map((r) => [
      r.tmdb_id as number,
      Math.round(r.mean as number),
    ]),
  );
}

/** Whatever we hold locally, most-rated first. The fallback when TMDB is out. */
async function localFallback(limit: number): Promise<WallPoster[]> {
  const rows = await db.execute(sql`
    with current as (
      select distinct on (user_id, film_id) user_id, film_id, rating
      from diary_entries
      where rating is not null and private = false
      order by user_id, film_id, watched_on desc nulls last, created_at desc
    ),
    means as (
      select film_id, avg(rating)::float as mean, count(*)::int as voters
      from current group by film_id
    )
    select f.poster_path, f.title, m.mean
    from films f
    left join means m on m.film_id = f.id
    where f.poster_path is not null
    order by m.voters desc nulls last, f.popularity desc nulls last
    limit ${limit}
  `);
  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    posterPath: r.poster_path as string,
    title: r.title as string,
    rating: r.mean == null ? null : Math.round(r.mean as number),
  }));
}

/**
 * The landing wall: this year's biggest films, refreshed straight from TMDB, so
 * it stays current without anyone editing a list. Ratings shown are the real
 * community mean where we have one, never invented; films nobody here has rated
 * simply show no number. Falls back to the local catalogue if TMDB is
 * unreachable, and to nothing at all if the database is cold.
 */
export async function wallPosters(limit = 12): Promise<WallPoster[]> {
  const year = new Date().getFullYear();

  try {
    let movies = (await topMoviesOfYear(year)).filter((m) => m.poster_path);

    // early in January the current year is thin; borrow from the one before
    if (movies.length < limit) {
      const prev = (await topMoviesOfYear(year - 1)).filter((m) => m.poster_path);
      const seen = new Set(movies.map((m) => m.id));
      movies = [...movies, ...prev.filter((m) => !seen.has(m.id))];
    }

    const top = movies.slice(0, limit);
    if (!top.length) return localFallback(limit);

    const means = await communityMeans(top.map((m) => m.id)).catch(() => new Map<number, number>());

    return top.map((m) => ({
      posterPath: m.poster_path as string,
      title: m.title,
      rating: means.get(m.id) ?? null,
    }));
  } catch {
    // no TMDB key, rate limited, or offline
    try {
      return await localFallback(limit);
    } catch {
      // a cold database shouldn't take the landing page down
      return [];
    }
  }
}
