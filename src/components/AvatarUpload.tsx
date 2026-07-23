"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { errorFrom } from "@/lib/http";
import Avatar from "./Avatar";

const TARGET_SIZE = 256;

function resizeToSquareJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        // cover-crop: fill the square, cropping the longer side
        const scale = TARGET_SIZE / Math.min(img.width, img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (TARGET_SIZE - w) / 2, (TARGET_SIZE - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't read that image"));
    };
    img.src = objectUrl;
  });
}

export default function AvatarUpload({
  username,
  displayName,
  avatarUrl,
}: {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await resizeToSquareJpeg(file);
      const res = await fetch("/api/settings/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) {
        setError(await errorFrom(res, "Couldn't save that photo."));
        return;
      }
      setPreview(dataUrl);
      router.refresh();
    } catch {
      setError("Couldn't read that image. Try a different file.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/avatar", { method: "DELETE" });
      if (!res.ok) {
        setError(await errorFrom(res, "Couldn't remove that photo."));
        return;
      }
      setPreview(null);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar avatarUrl={preview} name={displayName ?? username} size={64} />
      <div>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-card border border-seam px-3 py-1.5 text-paper hover:bg-tray disabled:opacity-50"
          >
            {preview ? "Change photo" : "Add photo"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="text-ash hover:text-warn disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
          aria-label="Upload profile photo"
        />
        {error && <p className="mt-1 text-xs text-warn">{error}</p>}
      </div>
    </div>
  );
}
