"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Friend = { id: string; username: string; displayName: string | null; rated: number };
type IncomingRequest = {
  requestId: string;
  userId: string;
  username: string;
  displayName: string | null;
};
type OutgoingRequest = { userId: string; username: string; displayName: string | null };
type PersonResult = { id: string; username: string; displayName: string | null };

type Props = {
  me: string;
  friends: Friend[];
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
};

export default function FriendsPanel({ me, friends, incoming, outgoing }: Props) {
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

  async function respond(requestId: string, action: "accept" | "decline") {
    await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    router.refresh();
  }

  async function cancel(userId: string) {
    await fetch("/api/friends/request", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.refresh();
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
      <PeopleSearch onChanged={() => router.refresh()} />

      {incoming.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-wide text-ash">Friend requests</h2>
          <ul className="mt-2 divide-y divide-seam border-y border-seam">
            {incoming.map((r) => (
              <li key={r.requestId} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <Link href={`/${r.username}`} className="text-paper hover:underline">
                    {r.displayName ?? r.username}
                  </Link>
                  <span className="block text-xs text-ash">@{r.username}</span>
                </span>
                <button
                  type="button"
                  onClick={() => respond(r.requestId, "accept")}
                  className="rounded-card bg-paper px-3 py-1.5 text-sm font-medium text-carbon hover:bg-white"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => respond(r.requestId, "decline")}
                  className="text-sm text-ash hover:text-warn"
                >
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-wide text-ash">Sent</h2>
          <ul className="mt-2 space-y-1.5">
            {outgoing.map((r) => (
              <li key={r.userId} className="flex items-center gap-3 text-sm">
                <Link href={`/${r.username}`} className="text-paper hover:underline">
                  {r.displayName ?? r.username}
                </Link>
                <span className="text-xs text-ash">waiting</span>
                <button
                  type="button"
                  onClick={() => cancel(r.userId)}
                  className="text-xs text-ash hover:text-warn"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-wide text-ash">Friends</h2>
        {friends.length === 0 ? (
          <p className="mt-2 text-ash">
            No friends yet. Search for someone above, or share your invite link below.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-seam border-y border-seam">
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

      <section className="mt-10 rounded-card border border-seam bg-tray p-4">
        <h2 className="text-paper">Or share an invite link</h2>
        <p className="mt-1 text-sm text-ash">
          For friends who aren&apos;t here yet — the link takes them through signup straight to
          being friends with you.
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
            className="mt-3 rounded-card border border-seam px-4 py-1.5 text-sm text-paper hover:bg-tray-2"
          >
            Get your invite link
          </button>
        )}
      </section>
    </div>
  );
}

function PeopleSearch({ onChanged }: { onChanged: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PersonResult[]>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    const query = q.trim();
    const t = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function add(userId: string) {
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setSent((s) => new Set(s).add(userId));
      onChanged();
    }
  }

  return (
    <section>
      <label htmlFor="people-search" className="mb-1 block text-sm text-ash">
        Find people
      </label>
      <input
        id="people-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Username or name"
        className="w-full rounded-card border border-seam bg-tray px-3 py-2 text-sm placeholder:text-ash focus:border-beam focus:outline-none"
      />
      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-seam rounded-card border border-seam bg-tray">
          {results.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <Link href={`/${p.username}`} className="text-sm text-paper hover:underline">
                  {p.displayName ?? p.username}
                </Link>
                <span className="block text-xs text-ash">@{p.username}</span>
              </span>
              <button
                type="button"
                onClick={() => add(p.id)}
                disabled={sent.has(p.id)}
                className="rounded-card border border-seam px-3 py-1 text-sm text-paper hover:bg-tray-2 disabled:opacity-60"
              >
                {sent.has(p.id) ? "Request sent" : "Add friend"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
