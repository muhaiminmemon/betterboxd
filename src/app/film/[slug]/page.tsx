import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, films, listMembers, lists, watchlist } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { hydrateFilm } from "@/lib/films";
import PosterImg from "@/components/PosterImg";
import FilmPanel from "@/components/FilmPanel";
import RewatchTimeline from "@/components/RewatchTimeline";
import ReviewsSection from "@/components/ReviewsSection";

export async function generateMetadata(ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const film = (await db.select().from(films).where(eq(films.slug, slug)).limit(1))[0];
  return { title: film ? `${film.title}${film.year ? ` (${film.year})` : ""}` : "Film" };
}

export default async function FilmPage(ctx: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviews?: string }>;
}) {
  const { slug } = await ctx.params;
  const { reviews: reviewsParam } = await ctx.searchParams;
  const reviewsTab = reviewsParam === "recent" ? ("recent" as const) : ("friends" as const);
  let film = (await db.select().from(films).where(eq(films.slug, slug)).limit(1))[0];
  if (!film) notFound();
  film = await hydrateFilm(film);

  const user = await getSessionUser();
  const entries = user
    ? await db
        .select()
        .from(diaryEntries)
        .where(and(eq(diaryEntries.userId, user.id), eq(diaryEntries.filmId, film.id)))
        .orderBy(sql`${diaryEntries.watchedOn} desc nulls last`, desc(diaryEntries.createdAt))
    : [];

  const ratedSorted = entries.filter((e) => e.rating !== null);
  const currentRated = ratedSorted[0] ?? null;

  const timelinePoints = entries
    .filter((e): e is typeof e & { watchedOn: string; rating: number } =>
      Boolean(e.watchedOn && e.rating !== null),
    )
    .map((e) => ({ watchedOn: e.watchedOn, rating: e.rating }))
    .sort((a, b) => a.watchedOn.localeCompare(b.watchedOn));

  const wlRow = user
    ? (
        await db
          .select()
          .from(watchlist)
          .where(and(eq(watchlist.userId, user.id), eq(watchlist.filmId, film.id)))
          .limit(1)
      )[0]
    : undefined;

  let editableLists: { id: string; title: string }[] = [];
  if (user) {
    const memberships = await db
      .select({ listId: listMembers.listId })
      .from(listMembers)
      .where(
        and(eq(listMembers.userId, user.id), inArray(listMembers.role, ["owner", "editor"])),
      );
    if (memberships.length) {
      editableLists = await db
        .select({ id: lists.id, title: lists.title })
        .from(lists)
        .where(inArray(lists.id, memberships.map((m) => m.listId)));
    }
  }

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <div className="w-40 shrink-0 sm:w-52">
        <PosterImg
          posterPath={film.posterPath}
          title={film.title}
          size="w500"
          sizes="(max-width: 640px) 160px, 208px"
          className="fade-up aspect-[2/3] w-full rounded-card"
          priority
        />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="display text-3xl font-medium leading-tight">
          {film.title}{" "}
          {film.year && <span className="num text-xl font-normal text-ash">{film.year}</span>}
        </h1>
        <p className="mt-1 text-sm text-ash">
          {[film.director, film.runtime ? `${film.runtime} min` : null, film.genres?.join(", ")]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {film.overview && <p className="mt-4 max-w-xl text-sm text-ash">{film.overview}</p>}

        <div className="mt-8 space-y-8">
          {timelinePoints.length >= 2 && <RewatchTimeline points={timelinePoints} />}
          {user ? (
            <FilmPanel
              filmId={film.id}
              entries={entries.map((e) => ({
                id: e.id,
                watchedOn: e.watchedOn,
                rating: e.rating,
                rewatch: e.rewatch,
                createdAt: e.createdAt.toISOString(),
              }))}
              currentRatedEntryId={currentRated?.id ?? null}
              currentRating={currentRated?.rating ?? null}
              inWatchlist={Boolean(wlRow)}
              watchlistSource={wlRow?.source ?? null}
              lists={editableLists}
            />
          ) : (
            <p className="text-ash">
              <Link href="/login" className="text-paper underline">
                Sign in
              </Link>{" "}
              to log and rate this film.
            </p>
          )}
          <ReviewsSection filmId={film.id} filmSlug={film.slug} viewer={user} tab={reviewsTab} />
        </div>
      </div>
    </div>
  );
}
