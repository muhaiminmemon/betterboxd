import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, films, listItems, listMembers, lists, watchlist } from "@/db/schema";
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
      spoiler: diaryEntries.spoiler,
      private: diaryEntries.private,
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

  const memberships = await db
    .select({ listId: listMembers.listId, role: listMembers.role })
    .from(listMembers)
    .where(eq(listMembers.userId, user.id));
  const myLists = memberships.length
    ? await db
        .select()
        .from(lists)
        .where(inArray(lists.id, memberships.map((m) => m.listId)))
    : [];
  const items = myLists.length
    ? await db
        .select({
          listId: listItems.listId,
          title: films.title,
          year: films.year,
          tmdbId: films.tmdbId,
        })
        .from(listItems)
        .innerJoin(films, eq(films.id, listItems.filmId))
        .where(inArray(listItems.listId, myLists.map((l) => l.id)))
    : [];

  const body = {
    exportedAt: new Date().toISOString(),
    username: user.username,
    diary: entries.map((e) => ({
      ...e,
      rating: e.rating === null ? null : formatTenths(e.rating),
    })),
    watchlist: wl,
    lists: myLists.map((l) => ({
      title: l.title,
      description: l.description,
      role: memberships.find((m) => m.listId === l.id)?.role,
      films: items
        .filter((i) => i.listId === l.id)
        .map((i) => ({ title: i.title, year: i.year, tmdbId: i.tmdbId })),
    })),
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="betterboxd-${user.username}.json"`,
    },
  });
}
