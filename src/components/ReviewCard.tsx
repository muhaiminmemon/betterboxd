"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type ReviewData = {
  id: string;
  review: string;
  spoiler: boolean;
  rating: string | null;
  watchedOn: string | null;
  username: string;
  displayName: string | null;
  comments: {
    id: string;
    body: string;
    username: string;
    displayName: string | null;
    mine: boolean;
  }[];
};

export default function ReviewCard({
  review,
  signedIn,
}: {
  review: ReviewData;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(!review.spoiler);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: review.id, body }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  async function deleteComment(id: string) {
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function report() {
    const reason = window.prompt("What's wrong with this review?");
    if (!reason) return;
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectType: "review", subjectId: review.id, reason }),
    });
    setReported(true);
  }

  return (
    <li className="border-b border-seam pb-4">
      <div className="flex items-baseline gap-2 text-sm">
        <Link href={`/${review.username}`} className="text-paper hover:underline">
          {review.displayName ?? review.username}
        </Link>
        {review.rating && <span className="num text-paper">{review.rating}</span>}
        {review.watchedOn && <span className="num text-xs text-ash">{review.watchedOn}</span>}
        {review.spoiler && <span className="text-xs text-warn">spoilers</span>}
      </div>
      {revealed ? (
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-ash">{review.review}</p>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-1.5 rounded-card border border-seam px-3 py-1.5 text-sm text-ash hover:text-paper"
        >
          This review mentions plot details — show it
        </button>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-ash">
        <button type="button" onClick={() => setCommentsOpen((o) => !o)} className="hover:text-paper">
          {review.comments.length
            ? `Comments (${review.comments.length})`
            : "Comment"}
        </button>
        {signedIn && (
          <button type="button" onClick={report} disabled={reported} className="hover:text-paper disabled:opacity-60">
            {reported ? "Reported" : "Report"}
          </button>
        )}
      </div>
      {commentsOpen && (
        <div className="mt-2 space-y-2 border-l border-seam pl-3">
          {review.comments.map((c) => (
            <p key={c.id} className="text-sm text-ash">
              <Link href={`/${c.username}`} className="text-paper hover:underline">
                {c.displayName ?? c.username}
              </Link>{" "}
              {c.body}
              {c.mine && (
                <button
                  type="button"
                  onClick={() => deleteComment(c.id)}
                  className="ml-2 text-xs text-ash hover:text-warn"
                >
                  Delete
                </button>
              )}
            </p>
          ))}
          {signedIn && (
            <form onSubmit={addComment} className="flex gap-2">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add a comment"
                aria-label="Add a comment"
                maxLength={5000}
                className="min-w-0 flex-1 rounded-card border border-seam bg-tray px-2 py-1 text-sm placeholder:text-ash focus:border-beam focus:outline-none"
              />
              <button type="submit" className="text-sm text-ash hover:text-paper">
                Post
              </button>
            </form>
          )}
          {error && <p className="text-xs text-warn">{error}</p>}
        </div>
      )}
    </li>
  );
}
