import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import SettingsForm from "@/components/SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-md">
      <h1 className="display mb-6 text-2xl">Settings</h1>
      <SettingsForm
        username={user.username}
        displayName={user.displayName}
        bio={user.bio}
        privacy={user.privacy as "public" | "friends" | "private"}
      />
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
