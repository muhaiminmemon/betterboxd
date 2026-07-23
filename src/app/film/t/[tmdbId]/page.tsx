import { notFound, redirect } from "next/navigation";
import { ensureFilm } from "@/lib/films";
import { movieDetails, TmdbError } from "@/lib/tmdb";

/** Lands a TMDB search result in the catalogue, then redirects to its page. */
export default async function FilmByTmdbId(ctx: { params: Promise<{ tmdbId: string }> }) {
  const { tmdbId } = await ctx.params;
  const id = Number(tmdbId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let details;
  try {
    details = await movieDetails(id);
  } catch (e) {
    if (e instanceof TmdbError) notFound();
    throw e;
  }

  const film = await ensureFilm(details);
  redirect(`/film/${film.slug}`);
}
