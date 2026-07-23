import Link from "next/link";
import { formatTenths } from "@/lib/format";
import { posterUrl } from "@/lib/tmdb-urls";

export type ProfileDiaryRow = {
  id: string;
  watchedOn: string | null;
  rating: number | null;
  rewatch: boolean;
  title: string;
  year: number | null;
  slug: string;
  posterPath: string | null;
};

export default function ProfileDiaryList({ rows }: { rows: ProfileDiaryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="divide-y divide-seam border-y border-seam">
      {rows.map((e) => {
        const poster = posterUrl(e.posterPath, "w154");
        return (
          <li key={e.id} className="flex items-center gap-3 py-2">
            <span className="num w-16 shrink-0 text-xs text-ash">{e.watchedOn ?? ""}</span>
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
              {e.rating !== null ? formatTenths(e.rating) : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
