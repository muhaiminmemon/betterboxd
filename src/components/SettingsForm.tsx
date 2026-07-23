"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorFrom } from "@/lib/http";
import AvatarUpload from "./AvatarUpload";

type Props = {
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  privacy: "public" | "friends" | "private";
  commentPermission: "anyone" | "friends" | "off";
  showDiaryOnProfile: boolean;
  showWatchlistOnProfile: boolean;
};

export default function SettingsForm(props: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(props.displayName ?? "");
  const [bio, setBio] = useState(props.bio ?? "");
  const [privacy, setPrivacy] = useState(props.privacy);
  const [commentPermission, setCommentPermission] = useState(props.commentPermission);
  const [showDiaryOnProfile, setShowDiaryOnProfile] = useState(props.showDiaryOnProfile);
  const [showWatchlistOnProfile, setShowWatchlistOnProfile] = useState(
    props.showWatchlistOnProfile,
  );
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Any edit invalidates the "Saved" badge, which should describe what's on the server. */
  function edited<T>(set: (v: T) => void) {
    return (v: T) => {
      setSaved(false);
      set(v);
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName || null,
          bio: bio || null,
          privacy,
          commentPermission,
          showDiaryOnProfile,
          showWatchlistOnProfile,
        }),
      });
      if (!res.ok) {
        setError(await errorFrom(res, "Couldn't save your settings. Try again."));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block text-sm text-ash">Photo</span>
        <AvatarUpload
          username={props.username}
          displayName={props.displayName}
          avatarUrl={props.avatarUrl}
        />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm text-ash">Display name</span>
          <input
            value={displayName}
            onChange={(e) => edited(setDisplayName)(e.target.value)}
            maxLength={60}
            placeholder={props.username}
            className="w-full rounded-card border border-seam bg-tray px-3 py-2 focus:border-beam focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ash">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => edited(setBio)(e.target.value)}
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
                ["public", "Public: anyone with the link can see your profile"],
                ["friends", "Friends only"],
                ["private", "Private: only you"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="privacy"
                  checked={privacy === value}
                  onChange={() => edited(setPrivacy)(value)}
                />
                <span className={privacy === value ? "text-paper" : "text-ash"}>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm text-ash">
            On your profile, also show
          </legend>
          <p className="mb-1.5 text-xs text-ash">
            Your ranked library is always part of your profile when it&apos;s visible. These
            control the rest.
          </p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showDiaryOnProfile}
                onChange={(e) => edited(setShowDiaryOnProfile)(e.target.checked)}
              />
              <span className={showDiaryOnProfile ? "text-paper" : "text-ash"}>
                Recent diary entries
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showWatchlistOnProfile}
                onChange={(e) => edited(setShowWatchlistOnProfile)(e.target.checked)}
              />
              <span className={showWatchlistOnProfile ? "text-paper" : "text-ash"}>
                Watchlist
              </span>
            </label>
          </div>
          <p className="mt-1.5 text-xs text-ash">
            Entries you&apos;ve marked &quot;only me&quot; stay hidden either way.
          </p>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm text-ash">Comments on your reviews</legend>
          <div className="space-y-1.5">
            {(
              [
                ["anyone", "Anyone signed in"],
                ["friends", "Friends only"],
                ["off", "Off"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="commentPermission"
                  checked={commentPermission === value}
                  onChange={() => edited(setCommentPermission)(value)}
                />
                <span className={commentPermission === value ? "text-paper" : "text-ash"}>
                  {label}
                </span>
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
          {error && <span className="text-sm text-warn">{error}</span>}
        </div>
      </form>
    </div>
  );
}
