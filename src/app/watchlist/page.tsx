import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { films, watchlist } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import WatchlistQueue, { type Priority } from "@/components/WatchlistQueue";

export const metadata = { title: "Watchlist" };

export default async function WatchlistPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({
      filmId: watchlist.filmId,
      source: watchlist.source,
      priority: watchlist.priority,
      title: films.title,
      year: films.year,
      slug: films.slug,
      director: films.director,
      posterPath: films.posterPath,
    })
    .from(watchlist)
    .innerJoin(films, eq(films.id, watchlist.filmId))
    .where(eq(watchlist.userId, user.id))
    // the order you dragged into, newest-added first among untouched rows
    .orderBy(asc(watchlist.position), desc(watchlist.createdAt));

  return (
    <div>
      <h1 className="display mb-1 text-2xl">Watchlist</h1>
      <p className="mb-6 text-sm text-ash">
        What you mean to get to, in the order you mean to get to it.
      </p>
      {rows.length === 0 ? (
        <p className="text-ash">
          Nothing saved yet. When you add a film, you can note who recommended it, and future you
          will thank you.
        </p>
      ) : (
        <WatchlistQueue items={rows.map((r) => ({ ...r, priority: r.priority as Priority }))} />
      )}
    </div>
  );
}
