"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  username: string;
  displayName: string | null;
  bio: string | null;
  privacy: "public" | "friends" | "private";
};

export default function SettingsForm(props: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(props.displayName ?? "");
  const [bio, setBio] = useState(props.bio ?? "");
  const [privacy, setPrivacy] = useState(props.privacy);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName || null,
          bio: bio || null,
          privacy,
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-ash">Display name</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          placeholder={props.username}
          className="w-full rounded-card border border-seam bg-tray px-3 py-2 focus:border-beam focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-ash">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={1000}
          rows={3}
          className="w-full rounded-card border border-seam bg-tray px-3 py-2 focus:border-beam focus:outline-none"
        />
      </label>
      <fieldset>
        <legend className="mb-1 text-sm text-ash">Profile visibility</legend>
        <div className="space-y-1.5">
          {(
            [
              ["public", "Public — anyone with the link can see your library"],
              ["friends", "Friends only"],
              ["private", "Private — only you"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="privacy"
                checked={privacy === value}
                onChange={() => setPrivacy(value)}
              />
              <span className={privacy === value ? "text-paper" : "text-ash"}>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-card bg-paper px-4 py-1.5 text-sm font-medium text-carbon hover:bg-white disabled:opacity-50"
        >
          Save
        </button>
        {saved && <span className="text-sm text-ash">Saved</span>}
      </div>
    </form>
  );
}
