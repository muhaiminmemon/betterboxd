import { eq } from "drizzle-orm";
import { db } from "@/db";
import { films, type Film } from "@/db/schema";
import { directorOf, movieDetails, releaseYear, type TmdbMovie } from "./tmdb";

export function slugify(title: string, year: number | null): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return year ? `${base}-${year}` : base || "film";
}

/** Insert or return the cached film row for a TMDB search result. */
export async function ensureFilm(movie: TmdbMovie): Promise<Film> {
  const existing = await db.select().from(films).where(eq(films.tmdbId, movie.id)).limit(1);
  if (existing[0]) return existing[0];

  const year = releaseYear(movie);
  let slug = slugify(movie.title, year);
  const clash = await db.select({ id: films.id }).from(films).where(eq(films.slug, slug)).limit(1);
  if (clash[0]) slug = `${slug}-${movie.id}`;

  const inserted = await db
    .insert(films)
    .values({
      tmdbId: movie.id,
      slug,
      title: movie.title,
      year,
      posterPath: movie.poster_path ?? null,
      backdropPath: movie.backdrop_path ?? null,
      overview: movie.overview ?? null,
    })
    .onConflictDoNothing({ target: films.tmdbId })
    .returning();
  if (inserted[0]) return inserted[0];
  // lost a race — the row exists now
  const won = await db.select().from(films).where(eq(films.tmdbId, movie.id)).limit(1);
  return won[0];
}

const STALE_MS = 30 * 24 * 60 * 60 * 1000;

/** Fill in director/runtime/genres on demand; refresh stale metadata. */
export async function hydrateFilm(film: Film): Promise<Film> {
  if (!film.tmdbId) return film;
  const fresh = film.refreshedAt && Date.now() - film.refreshedAt.getTime() < STALE_MS;
  if (film.director && fresh) return film;
  try {
    const details = await movieDetails(film.tmdbId);
    const updated = await db
      .update(films)
      .set({
        title: details.title ?? film.title,
        year: releaseYear(details) ?? film.year,
        posterPath: details.poster_path ?? film.posterPath,
        backdropPath: details.backdrop_path ?? film.backdropPath,
        director: directorOf(details) ?? film.director,
        runtime: details.runtime ?? film.runtime,
        genres: details.genres?.map((g) => g.name) ?? film.genres,
        overview: details.overview ?? film.overview,
        refreshedAt: new Date(),
      })
      .where(eq(films.id, film.id))
      .returning();
    return updated[0] ?? film;
  } catch {
    // metadata refresh is best-effort; the page still renders
    return film;
  }
}
