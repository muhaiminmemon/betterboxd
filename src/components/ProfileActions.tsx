"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type Relationship =
  | { kind: "friends" }
  | { kind: "requested_out" }
  | { kind: "requested_in"; requestId: string }
  | { kind: "none" };

type Props = {
  profileId: string;
  profileUsername: string;
  viewerUsername: string;
  relationship: Relationship;
};

export default function ProfileActions({
  profileId,
  profileUsername,
  viewerUsername,
  relationship,
}: Props) {
  const router = useRouter();
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<Response>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const sendRequest = () =>
    act(() =>
      fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileId }),
      }),
    );

  const cancelRequest = () =>
    act(() =>
      fetch("/api/friends/request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileId }),
      }),
    );

  const respond = (requestId: string, action: "accept" | "decline") =>
    act(() =>
      fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      }),
    );

  const removeFriend = () =>
    act(() =>
      fetch("/api/friends", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileId }),
      }),
    );

  async function block() {
    if (!window.confirm(`Block ${profileUsername}? You won't see each other's profiles.`)) return;
    await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profileId }),
    });
    router.push("/library");
    router.refresh();
  }

  async function report() {
    const reason = window.prompt("What's wrong? A sentence is enough.");
    if (!reason) return;
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectType: "user", subjectId: profileId, reason }),
    });
    setReported(true);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      {relationship.kind === "friends" && (
        <>
          <Link
            href={`/watch/${viewerUsername}/${profileUsername}`}
            className="rounded-card bg-paper px-4 py-1.5 font-medium text-carbon hover:bg-white"
          >
            What should we watch?
          </Link>
          <button type="button" onClick={removeFriend} disabled={busy} className="text-ash hover:text-warn disabled:opacity-50">
            Remove friend
          </button>
        </>
      )}
      {relationship.kind === "none" && (
        <button
          type="button"
          onClick={sendRequest}
          disabled={busy}
          className="rounded-card bg-paper px-4 py-1.5 font-medium text-carbon hover:bg-white disabled:opacity-50"
        >
          Add friend
        </button>
      )}
      {relationship.kind === "requested_out" && (
        <>
          <span className="text-ash">Friend request sent</span>
          <button type="button" onClick={cancelRequest} disabled={busy} className="text-ash hover:text-warn disabled:opacity-50">
            Cancel
          </button>
        </>
      )}
      {relationship.kind === "requested_in" && (
        <>
          <button
            type="button"
            onClick={() => respond(relationship.requestId, "accept")}
            disabled={busy}
            className="rounded-card bg-paper px-4 py-1.5 font-medium text-carbon hover:bg-white disabled:opacity-50"
          >
            Accept friend request
          </button>
          <button
            type="button"
            onClick={() => respond(relationship.requestId, "decline")}
            disabled={busy}
            className="text-ash hover:text-warn disabled:opacity-50"
          >
            Decline
          </button>
        </>
      )}
      <button type="button" onClick={block} className="text-ash hover:text-warn">
        Block
      </button>
      <button type="button" onClick={report} disabled={reported} className="text-ash hover:text-paper disabled:opacity-60">
        {reported ? "Reported" : "Report"}
      </button>
    </div>
  );
}
