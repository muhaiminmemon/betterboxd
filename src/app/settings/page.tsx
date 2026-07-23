import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { blocks, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import SettingsForm from "@/components/SettingsForm";
import BlockedList from "@/components/BlockedList";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const blockedUsers = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(blocks)
    .innerJoin(users, eq(users.id, blocks.blockedId))
    .where(eq(blocks.blockerId, user.id));

  return (
    <div className="max-w-md">
      <h1 className="display mb-6 text-2xl">Settings</h1>
      <SettingsForm
        username={user.username}
        displayName={user.displayName}
        bio={user.bio}
        privacy={user.privacy as "public" | "friends" | "private"}
        commentPermission={user.commentPermission as "anyone" | "friends" | "off"}
      />
      <BlockedList blocked={blockedUsers} />
      <section className="mt-10 border-t border-seam pt-6">
        <h2 className="text-sm uppercase tracking-wide text-ash">Your data</h2>
        <p className="mt-2 text-sm text-ash">
          Everything you&apos;ve logged — diary, ratings, watchlist — in one file. Free forever.
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not navigation */}
        <a
          href="/api/export"
          className="mt-3 inline-block rounded-card border border-seam px-4 py-1.5 text-sm text-paper hover:bg-tray"
        >
          Export everything
        </a>
      </section>
    </div>
  );
}
