import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import SearchBox from "./SearchBox";
import SignOutButton from "./SignOutButton";

export default async function Nav() {
  const user = await getSessionUser();

  return (
    <header className="border-b border-seam">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href={user ? "/library" : "/"} className="display text-lg font-medium tracking-tight">
          betterboxd
        </Link>
        {user ? (
          <>
            <nav aria-label="Main" className="flex flex-wrap items-center gap-4 text-sm text-ash">
              <Link href="/library" className="hover:text-paper">Library</Link>
              <Link href="/diary" className="hover:text-paper">Diary</Link>
              <Link href="/feed" className="hover:text-paper">Feed</Link>
              <Link href="/watchlist" className="hover:text-paper">Watchlist</Link>
              <Link href="/lists" className="hover:text-paper">Lists</Link>
              <Link href="/friends" className="hover:text-paper">Friends</Link>
              <Link href="/import" className="hover:text-paper">Import</Link>
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <SearchBox />
              <Link
                href={`/${user.username}`}
                className="text-sm text-ash hover:text-paper"
                title="Your public profile"
              >
                {user.displayName ?? user.username}
              </Link>
              <Link href="/settings" className="text-sm text-ash hover:text-paper">
                Settings
              </Link>
              <SignOutButton />
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/login" className="text-ash hover:text-paper">Sign in</Link>
            <Link
              href="/signup"
              className="rounded-card bg-paper px-3 py-1.5 font-medium text-carbon hover:bg-white"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
