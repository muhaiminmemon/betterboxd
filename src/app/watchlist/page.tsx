import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { films, watchlist } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { posterUrl } from "@/lib/tmdb-urls";
import WatchlistRemove from "@/components/WatchlistRemove";

export const metadata = { title: "Watchlist" };

export default async function WatchlistPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({
      filmId: watchlist.filmId,
      source: watchlist.source,
      title: films.title,
      year: films.year,
      slug: films.slug,
      posterPath: films.posterPath,
    })
    .from(watchlist)
    .innerJoin(films, eq(films.id, watchlist.filmId))
    .where(eq(watchlist.userId, user.id))
    .orderBy(desc(watchlist.createdAt));

  return (
    <div>
      <h1 className="display mb-6 text-2xl">Watchlist</h1>
      {rows.length === 0 ? (
        <p className="text-ash">
          Nothing saved yet. When you add a film, you can note who recommended it — future you
          will thank you.
        </p>
      ) : (
        <ul className="divide-y divide-seam border-y border-seam">
          {rows.map((r) => {
            const poster = posterUrl(r.posterPath, "w154");
            return (
              <li key={r.filmId} className="flex items-center gap-3 py-2">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster}
                    alt={`Poster for ${r.title}`}
                    loading="lazy"
                    className="h-[60px] w-10 shrink-0 rounded-[3px] bg-tray object-cover"
                  />
                ) : (
                  <span className="h-[60px] w-10 shrink-0 rounded-[3px] bg-tray" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <Link href={`/film/${r.slug}`} className="block truncate text-paper hover:underline">
                    {r.title} <span className="num text-xs text-ash">{r.year ?? ""}</span>
                  </Link>
                  {r.source && <span className="block truncate text-xs text-ash">{r.source}</span>}
                </span>
                <WatchlistRemove filmId={r.filmId} title={r.title} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
