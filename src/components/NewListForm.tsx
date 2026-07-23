"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewListForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/lists/${data.list.id}`);
        router.refresh();
      }
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
    <form onSubmit={create} className="flex gap-2">
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
    </form>
  );
}
