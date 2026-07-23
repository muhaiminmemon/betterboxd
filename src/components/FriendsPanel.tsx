"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Friend = { id: string; username: string; displayName: string | null; rated: number };

export default function FriendsPanel({ me, friends }: { me: string; friends: Friend[] }) {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function getInvite() {
    const res = await fetch("/api/friends/invite", { method: "POST" });
    const data = await res.json();
    if (res.ok) setInviteUrl(data.url);
  }

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function remove(friend: Friend) {
    await fetch("/api/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: friend.id }),
    });
    router.refresh();
  }

  return (
    <div>
      <section className="rounded-card border border-seam bg-tray p-4">
        <h2 className="text-paper">Invite a friend</h2>
        <p className="mt-1 text-sm text-ash">
          Friendship here is mutual — share your link, they accept, done. Then you can find
          something to watch together.
        </p>
        {inviteUrl ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              aria-label="Your invite link"
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-card border border-seam bg-carbon px-3 py-1.5 text-sm text-ash"
            />
            <button
              type="button"
              onClick={copy}
              className="rounded-card bg-paper px-3 py-1.5 text-sm font-medium text-carbon hover:bg-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={getInvite}
            className="mt-3 rounded-card bg-paper px-4 py-1.5 text-sm font-medium text-carbon hover:bg-white"
          >
            Get your invite link
          </button>
        )}
      </section>

      <section className="mt-8">
        {friends.length === 0 ? (
          <p className="text-ash">No friends yet. Your invite link is how they arrive.</p>
        ) : (
          <ul className="divide-y divide-seam border-y border-seam">
            {friends.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <Link href={`/${f.username}`} className="text-paper hover:underline">
                    {f.displayName ?? f.username}
                  </Link>
                  <span className="num block text-xs text-ash">
                    @{f.username} · {f.rated} rated
                  </span>
                </span>
                <Link
                  href={`/watch/${me}/${f.username}`}
                  className="rounded-card border border-seam px-3 py-1.5 text-sm text-paper hover:bg-tray"
                >
                  What should we watch?
                </Link>
                <button
                  type="button"
                  onClick={() => remove(f)}
                  className="text-sm text-ash hover:text-warn"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
