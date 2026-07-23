import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getRankedLibrary } from "@/lib/library";
import { formatTenths } from "@/lib/format";
import LibraryView from "@/components/LibraryView";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const films = await getRankedLibrary(user.id);
  const rated = films.filter((f) => f.rating !== null);
  const mean =
    rated.length > 0
      ? formatTenths(Math.round(rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length))
      : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="display text-2xl">Library</h1>
        {films.length > 0 && (
          <p className="num text-sm text-ash">
            {films.length} films{mean ? ` · average ${mean}` : ""}
          </p>
        )}
      </div>

      {films.length === 0 ? (
        <div className="max-w-md py-12">
          <p className="text-lg text-paper">Your library is empty.</p>
          <p className="mt-2 text-ash">
            Import your Letterboxd history, or find a film and log your first viewing.
          </p>
          <div className="mt-6 flex gap-4">
            <Link
              href="/import"
              className="rounded-card bg-paper px-4 py-2 text-sm font-medium text-carbon hover:bg-white"
            >
              Import from Letterboxd
            </Link>
          </div>
        </div>
      ) : (
        <LibraryView films={films} editable />
      )}
    </div>
  );
}
