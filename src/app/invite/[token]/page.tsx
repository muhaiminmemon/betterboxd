import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invites, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import InviteAccept from "@/components/InviteAccept";

export const metadata = { title: "Invite" };

export default async function InvitePage(ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const invite = (
    await db
      .select({ userId: invites.userId, username: users.username, displayName: users.displayName })
      .from(invites)
      .innerJoin(users, eq(users.id, invites.userId))
      .where(eq(invites.token, token))
      .limit(1)
  )[0];
  if (!invite) notFound();

  const viewer = await getSessionUser();
  const name = invite.displayName ?? invite.username;

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="display text-2xl">{name} wants to be film friends</h1>
      <p className="mt-3 text-ash">
        Accepting makes the friendship mutual, so you can each see the other&apos;s diary and find
        films to watch together. Either of you can end it later.
      </p>
      {viewer ? (
        viewer.username === invite.username ? (
          <p className="mt-6 text-ash">This is your own invite link. Send it to someone else.</p>
        ) : (
          <InviteAccept token={token} friendUsername={invite.username} />
        )
      ) : (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            href={`/login?next=/invite/${token}`}
            className="rounded-card bg-paper px-4 py-2 text-sm font-medium text-carbon hover:bg-white"
          >
            Sign in to accept
          </Link>
          <Link href={`/signup?next=/invite/${token}`} className="text-ash underline hover:text-paper">
            Create an account
          </Link>
        </div>
      )}
    </div>
  );
}
