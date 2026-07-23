import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { friendRequests, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getRankedLibrary } from "@/lib/library";
import { formatTenths } from "@/lib/format";
import { areFriends, canViewProfile, isBlockedBetween } from "@/lib/social";
import LibraryView from "@/components/LibraryView";
import ProfileActions, { type Relationship } from "@/components/ProfileActions";

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

  if (viewer && !isOwner && (await isBlockedBetween(viewer.id, profile.id))) notFound();

  const visible = await canViewProfile(viewer, profile);

  let relationship: Relationship = { kind: "none" };
  if (viewer && !isOwner) {
    if (await areFriends(viewer.id, profile.id)) {
      relationship = { kind: "friends" };
    } else {
      const incoming = (
        await db
          .select({ id: friendRequests.id })
          .from(friendRequests)
          .where(and(eq(friendRequests.fromId, profile.id), eq(friendRequests.toId, viewer.id)))
          .limit(1)
      )[0];
      if (incoming) {
        relationship = { kind: "requested_in", requestId: incoming.id };
      } else {
        const outgoing = (
          await db
            .select({ id: friendRequests.id })
            .from(friendRequests)
            .where(and(eq(friendRequests.fromId, viewer.id), eq(friendRequests.toId, profile.id)))
            .limit(1)
        )[0];
        if (outgoing) relationship = { kind: "requested_out" };
      }
    }
  }

  if (!visible) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="display text-2xl">{profile.displayName ?? profile.username}</h1>
        <p className="mt-3 text-ash">This profile is private.</p>
        {viewer && !isOwner && (
          <ProfileActions
            profileId={profile.id}
            profileUsername={profile.username}
            viewerUsername={viewer.username}
            relationship={relationship}
          />
        )}
      </div>
    );
  }

  const films = await getRankedLibrary(profile.id, { includePrivate: isOwner });
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
        {viewer && !isOwner && (
          <ProfileActions
            profileId={profile.id}
            profileUsername={profile.username}
            viewerUsername={viewer.username}
            relationship={relationship}
          />
        )}
      </div>

      {films.length === 0 ? (
        <p className="text-ash">No films logged yet.</p>
      ) : (
        <LibraryView films={films} editable={isOwner} />
      )}
    </div>
  );
}
