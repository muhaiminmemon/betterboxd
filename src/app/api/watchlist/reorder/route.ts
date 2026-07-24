import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({ orderedFilmIds: z.array(z.string().uuid()).max(2000) });

/** Writes the queue order the drag produced. Positions are the array indices. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const { orderedFilmIds } = parsed.data;
  if (!orderedFilmIds.length) return NextResponse.json({ ok: true });

  // only touch rows that are actually this user's
  const owned = await db
    .select({ filmId: watchlist.filmId })
    .from(watchlist)
    .where(and(eq(watchlist.userId, user.id), inArray(watchlist.filmId, orderedFilmIds)));
  const ownedSet = new Set(owned.map((o) => o.filmId));

  await db.transaction(async (tx) => {
    for (const [i, filmId] of orderedFilmIds.entries()) {
      if (!ownedSet.has(filmId)) continue;
      await tx
        .update(watchlist)
        .set({ position: i })
        .where(and(eq(watchlist.userId, user.id), eq(watchlist.filmId, filmId)));
    }
  });

  return NextResponse.json({ ok: true });
}
