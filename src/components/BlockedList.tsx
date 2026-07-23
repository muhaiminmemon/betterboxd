"use client";

import { useRouter } from "next/navigation";

type Blocked = { id: string; username: string; displayName: string | null };

export default function BlockedList({ blocked }: { blocked: Blocked[] }) {
  const router = useRouter();

  if (!blocked.length) return null;

  async function unblock(userId: string) {
    await fetch("/api/blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.refresh();
  }

  return (
    <section className="mt-10 border-t border-seam pt-6">
      <h2 className="text-sm uppercase tracking-wide text-ash">Blocked</h2>
      <ul className="mt-2 space-y-1.5">
        {blocked.map((b) => (
          <li key={b.id} className="flex items-center gap-3 text-sm">
            <span className="text-paper">{b.displayName ?? b.username}</span>
            <span className="text-xs text-ash">@{b.username}</span>
            <button
              type="button"
              onClick={() => unblock(b.id)}
              className="text-xs text-ash hover:text-paper"
            >
              Unblock
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
