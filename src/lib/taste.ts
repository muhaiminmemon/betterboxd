import { sql } from "drizzle-orm";
import { db } from "@/db";

export type TasteProfile = {
  /** films with a rating; the basis for everything else here */
  rated: number;
  /** mean rating in tenths, or null when nothing is rated yet */
  mean: number | null;
  topGenres: { name: string; count: number }[];
  topDecade: { decade: number; count: number } | null;
  topDirector: { name: string; count: number } | null;
};

/**
 * A person in one glance, built from what they've actually rated. Counts come
 * from the current rating per film, so a rewatch never double-counts.
 */
export async function getTasteProfile(
  userId: string,
  { includePrivate = false }: { includePrivate?: boolean } = {},
): Promise<TasteProfile> {
  const privacy = includePrivate ? sql`true` : sql`private = false`;

  // one row per film: its most recent rated entry
  const current = sql`
    select distinct on (d.film_id) d.film_id, d.rating
    from diary_entries d
    where d.user_id = ${userId} and d.rating is not null and ${privacy}
    order by d.film_id, d.watched_on desc nulls last, d.created_at desc
  `;

  const summary = await db.execute(sql`
    with cur as (${current})
    select count(*)::int as rated, avg(cur.rating)::float as mean
    from cur
  `);
  const s = (summary as unknown as Record<string, unknown>[])[0];
  const rated = (s?.rated as number) ?? 0;
  const mean = rated ? Math.round(s.mean as number) : null;

  if (!rated) {
    return { rated: 0, mean: null, topGenres: [], topDecade: null, topDirector: null };
  }

  const genres = await db.execute(sql`
    with cur as (${current})
    select g.value as name, count(*)::int as count
    from cur
    join films f on f.id = cur.film_id
    cross join lateral jsonb_array_elements_text(coalesce(f.genres, '[]'::jsonb)) as g(value)
    group by g.value
    order by count desc, name asc
    limit 3
  `);

  const decades = await db.execute(sql`
    with cur as (${current})
    select (f.year / 10) * 10 as decade, count(*)::int as count
    from cur
    join films f on f.id = cur.film_id
    where f.year is not null
    group by 1
    order by count desc, decade desc
    limit 1
  `);

  // only films they rated above their own mean count as "returns to"
  const directors = await db.execute(sql`
    with cur as (${current})
    select f.director as name, count(*)::int as count
    from cur
    join films f on f.id = cur.film_id
    where f.director is not null and cur.rating >= ${mean}
    group by f.director
    having count(*) > 1
    order by count desc, name asc
    limit 1
  `);

  const g = genres as unknown as Record<string, unknown>[];
  const d = (decades as unknown as Record<string, unknown>[])[0];
  const dir = (directors as unknown as Record<string, unknown>[])[0];

  return {
    rated,
    mean,
    topGenres: g.map((r) => ({ name: r.name as string, count: r.count as number })),
    topDecade: d ? { decade: d.decade as number, count: d.count as number } : null,
    topDirector: dir ? { name: dir.name as string, count: dir.count as number } : null,
  };
}

export type MutualLove = {
  slug: string;
  title: string;
  year: number | null;
  posterPath: string | null;
  mine: number;
  theirs: number;
};

/** Films you both rated highly: the actual common ground, not a similarity score. */
export async function getMutualLoves(
  aUserId: string,
  bUserId: string,
  { threshold = 80, limit = 6 }: { threshold?: number; limit?: number } = {},
): Promise<MutualLove[]> {
  const rows = await db.execute(sql`
    with a as (
      select distinct on (film_id) film_id, rating from diary_entries
      where user_id = ${aUserId} and rating is not null and private = false
      order by film_id, watched_on desc nulls last, created_at desc
    ),
    b as (
      select distinct on (film_id) film_id, rating from diary_entries
      where user_id = ${bUserId} and rating is not null and private = false
      order by film_id, watched_on desc nulls last, created_at desc
    )
    select f.slug, f.title, f.year, f.poster_path, a.rating as mine, b.rating as theirs
    from a
    join b on b.film_id = a.film_id
    join films f on f.id = a.film_id
    where a.rating >= ${threshold} and b.rating >= ${threshold}
    order by least(a.rating, b.rating) desc, f.title asc
    limit ${limit}
  `);

  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    slug: r.slug as string,
    title: r.title as string,
    year: r.year as number | null,
    posterPath: r.poster_path as string | null,
    mine: r.mine as number,
    theirs: r.theirs as number,
  }));
}
