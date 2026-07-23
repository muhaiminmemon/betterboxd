import { redirect } from "next/navigation";
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
        rated: e.rated,
      };
    }),
  );

  return (
    <div className="max-w-xl">
      <h1 className="display mb-6 text-2xl">Friends</h1>
      <FriendsPanel me={user.username} friends={withEligibility} />
    </div>
  );
}
