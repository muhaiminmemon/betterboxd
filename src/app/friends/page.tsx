import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { friendRequests, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { friendsOf } from "@/lib/social";
import { eligibilityOf } from "@/lib/recs";
import FriendsPanel from "@/components/FriendsPanel";

export const metadata = { title: "Friends" };

export default async function FriendsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const friends = await friendsOf(user.id);
  const withEligibility = await Promise.all(
    friends.map(async (f) => {
      const e = await eligibilityOf(f.id);
      return {
        id: f.id,
        username: f.username,
        displayName: f.displayName,
        avatarUrl: f.avatarUrl,
        rated: e.rated,
      };
    }),
  );

  const fromUser = alias(users, "from_user");
  const incoming = await db
    .select({
      requestId: friendRequests.id,
      userId: fromUser.id,
      username: fromUser.username,
      displayName: fromUser.displayName,
      avatarUrl: fromUser.avatarUrl,
    })
    .from(friendRequests)
    .innerJoin(fromUser, eq(fromUser.id, friendRequests.fromId))
    .where(eq(friendRequests.toId, user.id));

  const toUser = alias(users, "to_user");
  const outgoing = await db
    .select({
      userId: toUser.id,
      username: toUser.username,
      displayName: toUser.displayName,
      avatarUrl: toUser.avatarUrl,
    })
    .from(friendRequests)
    .innerJoin(toUser, eq(toUser.id, friendRequests.toId))
    .where(eq(friendRequests.fromId, user.id));

  return (
    <div className="max-w-xl">
      <h1 className="display mb-6 text-2xl">Friends</h1>
      <FriendsPanel
        me={user.username}
        friends={withEligibility}
        incoming={incoming}
        outgoing={outgoing}
      />
    </div>
  );
}
