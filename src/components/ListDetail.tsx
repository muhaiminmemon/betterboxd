"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { posterUrl } from "@/lib/tmdb-urls";
import { errorFrom } from "@/lib/http";
import type { ListRole } from "@/lib/lists";
import Avatar from "./Avatar";

type Item = {
  filmId: string;
  title: string;
  year: number | null;
  slug: string;
  posterPath: string | null;
  director: string | null;
};

type Member = {
  userId: string;
  role: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type Props = {
  list: { id: string; title: string; description: string | null };
  items: Item[];
  members: Member[];
  myRole: ListRole;
  myUserId: string;
};

export default function ListDetail({ list, items, members, myRole, myUserId }: Props) {
  const router = useRouter();
  const canEdit = myRole === "owner" || myRole === "editor";
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<"editor" | "viewer">("editor");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** One mutation at a time, and never silently. */
  async function act(fn: () => Promise<Response>, fallback: string) {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        setError(await errorFrom(res, fallback));
        return false;
      }
      return true;
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveTitle() {
    const ok = await act(
      () =>
        fetch(`/api/lists/${list.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }),
      "Couldn't rename this list.",
    );
    if (!ok) return;
    setRenaming(false);
    router.refresh();
  }

  async function removeItem(filmId: string) {
    const ok = await act(
      () =>
        fetch(`/api/lists/${list.id}/items`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmId }),
        }),
      "Couldn't remove that film.",
    );
    if (ok) router.refresh();
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    const ok = await act(
      () =>
        fetch(`/api/lists/${list.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: memberName, role: memberRole }),
        }),
      "Couldn't add that person.",
    );
    if (!ok) return;
    setMemberName("");
    router.refresh();
  }

  async function removeMember(userId: string) {
    const leaving = userId === myUserId;
    if (leaving && !window.confirm(`Leave "${list.title}"? You'll lose access to it.`)) return;
    const ok = await act(
      () =>
        fetch(`/api/lists/${list.id}/members`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }),
      leaving ? "Couldn't leave this list." : "Couldn't remove that member.",
    );
    if (!ok) return;
    if (leaving) router.push("/lists");
    router.refresh();
  }

  async function deleteList() {
    if (
      !window.confirm(
        `Delete "${list.title}" for everyone? Its ${items.length} film${
          items.length === 1 ? "" : "s"
        } and all members go with it. This can't be undone.`,
      )
    )
      return;
    const ok = await act(
      () => fetch(`/api/lists/${list.id}`, { method: "DELETE" }),
      "Couldn't delete this list.",
    );
    if (!ok) return;
    router.push("/lists");
    router.refresh();
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3">
        {renaming ? (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-w-0 flex-1 rounded-card border border-seam bg-tray px-3 py-1.5 text-lg focus:border-beam focus:outline-none"
            />
            <button
              type="button"
              onClick={saveTitle}
              disabled={busy}
              className="text-sm text-ash hover:text-paper disabled:opacity-50"
            >
              Save
            </button>
          </>
        ) : (
          <>
            <h1 className="display text-2xl">{list.title}</h1>
            {myRole === "owner" && (
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="text-sm text-ash hover:text-paper"
              >
                Rename
              </button>
            )}
          </>
        )}
      </div>
      {list.description && <p className="mt-1 text-sm text-ash">{list.description}</p>}

      {items.length === 0 ? (
        <p className="mt-6 text-ash">
          Empty so far. Add films from their pages, or save picks from “What should we watch?”
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-seam border-y border-seam">
          {items.map((i) => {
            const poster = posterUrl(i.posterPath, "w154");
            return (
              <li key={i.filmId} className="flex items-center gap-3 py-2">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster}
                    alt={`Poster for ${i.title}`}
                    loading="lazy"
                    className="h-[60px] w-10 shrink-0 rounded-[3px] bg-tray object-cover"
                  />
                ) : (
                  <span className="h-[60px] w-10 shrink-0 rounded-[3px] bg-tray" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <Link href={`/film/${i.slug}`} className="block truncate text-paper hover:underline">
                    {i.title} <span className="num text-xs text-ash">{i.year ?? ""}</span>
                  </Link>
                  {i.director && <span className="block truncate text-xs text-ash">{i.director}</span>}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeItem(i.filmId)}
                    disabled={busy}
                    aria-label={`Remove ${i.title} from list`}
                    className="text-ash hover:text-warn disabled:opacity-50"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-wide text-ash">Members</h2>
        <ul className="mt-2 space-y-1">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2 text-sm">
              <Avatar avatarUrl={m.avatarUrl} name={m.displayName ?? m.username} size={22} />
              <Link href={`/${m.username}`} className="text-paper hover:underline">
                {m.displayName ?? m.username}
              </Link>
              <span className="text-xs text-ash">{m.role}</span>
              {(myRole === "owner" && m.userId !== myUserId) ||
              (m.userId === myUserId && myRole !== "owner") ? (
                <button
                  type="button"
                  onClick={() => removeMember(m.userId)}
                  disabled={busy}
                  className="text-xs text-ash hover:text-warn disabled:opacity-50"
                >
                  {m.userId === myUserId ? "Leave" : "Remove"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {myRole === "owner" && (
          <form onSubmit={addMember} className="mt-3 flex gap-2">
            <input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Username"
              aria-label="Add member by username"
              className="min-w-0 flex-1 rounded-card border border-seam bg-tray px-3 py-1.5 text-sm placeholder:text-ash focus:border-beam focus:outline-none"
            />
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as "editor" | "viewer")}
              aria-label="Role"
              className="rounded-card border border-seam bg-tray px-2 py-1.5 text-sm"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="rounded-card border border-seam px-3 py-1.5 text-sm text-paper hover:bg-tray disabled:opacity-50"
            >
              Add
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-sm text-warn">{error}</p>}
      </section>

      {myRole === "owner" && (
        <div className="mt-10 border-t border-seam pt-4">
          <button
            type="button"
            onClick={deleteList}
            disabled={busy}
            className="text-sm text-ash hover:text-warn disabled:opacity-50"
          >
            Delete this list
          </button>
        </div>
      )}
    </div>
  );
}
