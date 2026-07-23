import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, films, watchlist } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { formatTenths } from "@/lib/library";

/** Everything the user owns, as JSON. Free forever, never paywalled. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const entries = await db
    .select({
      title: films.title,
      year: films.year,
      tmdbId: films.tmdbId,
      watchedOn: diaryEntries.watchedOn,
      rating: diaryEntries.rating,
      review: diaryEntries.review,
      rewatch: diaryEntries.rewatch,
      createdAt: diaryEntries.createdAt,
    })
    .from(diaryEntries)
    .innerJoin(films, eq(films.id, diaryEntries.filmId))
    .where(eq(diaryEntries.userId, user.id));

  const wl = await db
    .select({
      title: films.title,
      year: films.year,
      tmdbId: films.tmdbId,
      source: watchlist.source,
      addedAt: watchlist.createdAt,
    })
    .from(watchlist)
    .innerJoin(films, eq(films.id, watchlist.filmId))
    .where(eq(watchlist.userId, user.id));

  const body = {
    exportedAt: new Date().toISOString(),
    username: user.username,
    diary: entries.map((e) => ({
      ...e,
      rating: e.rating === null ? null : formatTenths(e.rating),
    })),
    watchlist: wl,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="betterboxd-${user.username}.json"`,
    },
  });
}
