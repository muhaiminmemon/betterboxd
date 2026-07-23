export { posterUrl, POSTER_BASE } from "./tmdb-urls";

const TMDB_BASE = "https://api.themoviedb.org/3";

export type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  popularity?: number;
};

export type TmdbMovieDetails = TmdbMovie & {
  runtime?: number | null;
  genres?: { id: number; name: string }[];
  credits?: { crew?: { job: string; name: string }[] };
};

export class TmdbError extends Error {}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new TmdbError("TMDB_API_KEY is not set. Add it to .env.local.");
  }
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new TmdbError(`TMDB request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function searchMovies(query: string, year?: number): Promise<TmdbMovie[]> {
  const params: Record<string, string> = { query, include_adult: "false" };
  if (year) params.primary_release_year = String(year);
  const data = await tmdb<{ results: TmdbMovie[] }>("/search/movie", params);
  return data.results ?? [];
}

export async function movieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return tmdb<TmdbMovieDetails>(`/movie/${tmdbId}`, { append_to_response: "credits" });
}

export function releaseYear(m: { release_date?: string }): number | null {
  const y = m.release_date?.slice(0, 4);
  return y ? Number(y) : null;
}

export function directorOf(details: TmdbMovieDetails): string | null {
  const directors = details.credits?.crew?.filter((c) => c.job === "Director") ?? [];
  return directors.length ? directors.map((d) => d.name).join(", ") : null;
}
