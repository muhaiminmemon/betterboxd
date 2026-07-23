import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, films } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { formatTenths } from "@/lib/format";
import { posterUrl } from "@/lib/tmdb-urls";

export const metadata = { title: "Diary" };

type Row = {
  id: string;
  watchedOn: string | null;
  rating: number | null;
  rewatch: boolean;
  private: boolean;
  title: string;
  year: number | null;
  slug: string;
  posterPath: string | null;
};

function monthLabel(watchedOn: string): string {
  return new Date(watchedOn + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default async function DiaryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const entries: Row[] = await db
    .select({
      id: diaryEntries.id,
      watchedOn: diaryEntries.watchedOn,
      rating: diaryEntries.rating,
      rewatch: diaryEntries.rewatch,
      private: diaryEntries.private,
      title: films.title,
      year: films.year,
      slug: films.slug,
      posterPath: films.posterPath,
    })
    .from(diaryEntries)
    .innerJoin(films, eq(films.id, diaryEntries.filmId))
    .where(eq(diaryEntries.userId, user.id))
    .orderBy(sql`${diaryEntries.watchedOn} desc nulls last`, desc(diaryEntries.createdAt))
    .limit(1000);

  // group runs of entries by month; undated entries collect at the end
  const groups: { label: string; rows: Row[] }[] = [];
  for (const e of entries) {
    const label = e.watchedOn ? monthLabel(e.watchedOn) : "No date";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(e);
    else groups.push({ label, rows: [e] });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="display text-2xl">Diary</h1>
        <p className="mt-1 text-sm text-ash">
          Every viewing in order, rewatches included. Your ranked{" "}
          <Link href="/library" className="text-paper underline underline-offset-2">
            library
          </Link>{" "}
          shows one row per film.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="text-ash">
          Nothing logged yet. Find a film up top, or{" "}
          <Link href="/import" className="text-paper underline">
            import your Letterboxd history
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((g, gi) => (
            <section key={`${g.label}-${gi}`}>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-ash">{g.label}</h2>
              <ul className="divide-y divide-seam border-y border-seam">
                {g.rows.map((e) => {
                  const poster = posterUrl(e.posterPath, "w154");
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-2 transition-colors hover:bg-tray/50">
                      <span className="num w-8 shrink-0 text-right text-xs text-ash">
                        {e.watchedOn ? e.watchedOn.slice(8, 10) : ""}
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
                        <Link
                          href={`/film/${e.slug}`}
                          className="block truncate text-paper hover:underline"
                        >
                          {e.title} <span className="num text-xs text-ash">{e.year ?? ""}</span>
                        </Link>
                        <span className="flex gap-2 text-xs text-ash">
                          {e.rewatch && <span>rewatch</span>}
                          {e.private && <span>only you</span>}
                        </span>
                      </span>
                      <span className="num w-12 shrink-0 text-right text-paper">
                        {e.rating !== null ? formatTenths(e.rating) : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
