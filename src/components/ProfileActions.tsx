"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  profileId: string;
  profileUsername: string;
  viewerUsername: string;
  isFriend: boolean;
};

export default function ProfileActions({
  profileId,
  profileUsername,
  viewerUsername,
  isFriend,
}: Props) {
  const router = useRouter();
  const [reported, setReported] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function removeFriend() {
    await fetch("/api/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profileId }),
    });
    router.refresh();
  }

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

  async function invite() {
    const res = await fetch("/api/friends/invite", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setInviteUrl(data.url);
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      {isFriend ? (
        <>
          <Link
            href={`/watch/${viewerUsername}/${profileUsername}`}
            className="rounded-card bg-paper px-4 py-1.5 font-medium text-carbon hover:bg-white"
          >
            What should we watch?
          </Link>
          <button type="button" onClick={removeFriend} className="text-ash hover:text-warn">
            Remove friend
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={invite}
          className="rounded-card border border-seam px-4 py-1.5 text-paper hover:bg-tray"
        >
          {copied ? "Invite link copied — send it to them" : "Invite to be friends"}
        </button>
      )}
      <button type="button" onClick={block} className="text-ash hover:text-warn">
        Block
      </button>
      <button type="button" onClick={report} disabled={reported} className="text-ash hover:text-paper disabled:opacity-60">
        {reported ? "Reported" : "Report"}
      </button>
      {inviteUrl && !copied && <span className="num text-xs text-ash">{inviteUrl}</span>}
    </div>
  );
}
