import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const addSchema = z.object({
  filmId: z.string().uuid(),
  source: z.string().max(200).nullable().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  await db
    .insert(watchlist)
    .values({ userId: user.id, filmId: parsed.data.filmId, source: parsed.data.source ?? null })
    .onConflictDoUpdate({
      target: [watchlist.userId, watchlist.filmId],
      set: { source: parsed.data.source ?? null },
    });

  return NextResponse.json({ ok: true });
}

const removeSchema = z.object({ filmId: z.string().uuid() });

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = removeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, user.id), eq(watchlist.filmId, parsed.data.filmId)));

  return NextResponse.json({ ok: true });
}
