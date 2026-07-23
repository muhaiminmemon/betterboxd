import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { libraryOrder } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  /** film ids of one tie group, in the user's chosen order */
  orderedFilmIds: z.array(z.string().uuid()).min(1).max(500),
});

/** Persists manual order within a group of equally rated films. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const values = parsed.data.orderedFilmIds.map((filmId, i) => ({
    userId: user.id,
    filmId,
    sortKey: i + 1,
  }));
  for (const v of values) {
    await db
      .insert(libraryOrder)
      .values(v)
      .onConflictDoUpdate({
        target: [libraryOrder.userId, libraryOrder.filmId],
        set: { sortKey: v.sortKey },
      });
  }

  return NextResponse.json({ ok: true });
}
