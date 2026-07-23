import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getRankedLibrary } from "@/lib/library";
import { formatTenths } from "@/lib/format";
import LibraryView from "@/components/LibraryView";

export async function generateMetadata(ctx: { params: Promise<{ username: string }> }) {
  const { username } = await ctx.params;
  return { title: `@${username}` };
}

export default async function ProfilePage(ctx: { params: Promise<{ username: string }> }) {
  const { username } = await ctx.params;
  const profile = (
    await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1)
  )[0];
  if (!profile) notFound();

  const viewer = await getSessionUser();
  const isOwner = viewer?.id === profile.id;

  // friends-only acts as private until friendships ship
  if (profile.privacy !== "public" && !isOwner) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="display text-2xl">{profile.displayName ?? profile.username}</h1>
        <p className="mt-3 text-ash">This profile is private.</p>
      </div>
    );
  }

  const films = await getRankedLibrary(profile.id);
  const rated = films.filter((f) => f.rating !== null);
  const mean =
    rated.length > 0
      ? formatTenths(Math.round(rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length))
      : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="display text-3xl font-medium">
          {profile.displayName ?? profile.username}
        </h1>
        <p className="num mt-1 text-sm text-ash">
          @{profile.username}
          {films.length ? ` · ${films.length} films` : ""}
          {mean ? ` · average ${mean}` : ""}
        </p>
        {profile.bio && <p className="mt-3 max-w-lg text-sm text-ash">{profile.bio}</p>}
      </div>

      {films.length === 0 ? (
        <p className="text-ash">No films logged yet.</p>
      ) : (
        <LibraryView films={films} editable={isOwner} />
      )}
    </div>
  );
}
