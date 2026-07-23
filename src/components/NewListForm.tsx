"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorFrom, readJson } from "@/lib/http";

export default function NewListForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        setError(await errorFrom(res, "Couldn't create that list."));
        return;
      }
      const data = await readJson<{ list: { id: string } }>(res);
      if (!data.list?.id) {
        setError("Couldn't create that list.");
        return;
      }
      router.push(`/lists/${data.list.id}`);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-card bg-paper px-4 py-1.5 text-sm font-medium text-carbon hover:bg-white"
      >
        New list
      </button>
    );
  }

  return (
    <form onSubmit={create} className="flex flex-wrap gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="List title"
        aria-label="List title"
        autoFocus
        required
        maxLength={120}
        className="min-w-0 flex-1 rounded-card border border-seam bg-tray px-3 py-1.5 text-sm placeholder:text-ash focus:border-beam focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-card bg-paper px-4 py-1.5 text-sm font-medium text-carbon hover:bg-white disabled:opacity-50"
      >
        Create
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-ash hover:text-paper">
        Cancel
      </button>
      {error && <p className="w-full text-sm text-warn">{error}</p>}
    </form>
  );
}
