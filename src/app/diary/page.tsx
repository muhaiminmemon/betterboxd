import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, films } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { formatTenths } from "@/lib/format";
import { posterUrl } from "@/lib/tmdb-urls";

export const metadata = { title: "Diary" };

export default async function DiaryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const entries = await db
    .select({
      id: diaryEntries.id,
      watchedOn: diaryEntries.watchedOn,
      rating: diaryEntries.rating,
      rewatch: diaryEntries.rewatch,
      title: films.title,
      year: films.year,
      slug: films.slug,
      posterPath: films.posterPath,
    })
    .from(diaryEntries)
    .innerJoin(films, eq(films.id, diaryEntries.filmId))
    .where(eq(diaryEntries.userId, user.id))
    .orderBy(sql`${diaryEntries.watchedOn} desc nulls last`, desc(diaryEntries.createdAt))
    .limit(500);

  return (
    <div>
      <h1 className="display mb-6 text-2xl">Diary</h1>
      {entries.length === 0 ? (
        <p className="text-ash">
          Nothing logged yet. Find a film up top, or{" "}
          <Link href="/import" className="text-paper underline">
            import your Letterboxd history
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-seam border-y border-seam">
          {entries.map((e) => {
            const poster = posterUrl(e.posterPath, "w154");
            return (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <span className="num w-24 shrink-0 text-xs text-ash">
                  {e.watchedOn ?? "No date"}
                </span>
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster}
                    alt={`Poster for ${e.title}`}
                    loading="lazy"
                    className="h-[45px] w-[30px] shrink-0 rounded-[3px] bg-tray object-cover"
                  />
                ) : (
                  <span className="h-[45px] w-[30px] shrink-0 rounded-[3px] bg-tray" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <Link href={`/film/${e.slug}`} className="block truncate text-paper hover:underline">
                    {e.title} <span className="num text-xs text-ash">{e.year ?? ""}</span>
                  </Link>
                  {e.rewatch && <span className="text-xs text-ash">rewatch</span>}
                </span>
                <span className="num w-12 shrink-0 text-right text-paper">
                  {e.rating !== null ? formatTenths(e.rating) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
