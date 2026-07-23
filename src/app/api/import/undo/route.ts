import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { diaryEntries, imports, watchlist } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({ importId: z.string().uuid() });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const row = (
    await db
      .select()
      .from(imports)
      .where(and(eq(imports.id, parsed.data.importId), eq(imports.userId, user.id)))
      .limit(1)
  )[0];
  if (!row) return NextResponse.json({ error: "Import not found." }, { status: 404 });
  if (row.status !== "committed") {
    return NextResponse.json({ error: "Nothing to undo for this import." }, { status: 409 });
  }

  const removedEntries = await db
    .delete(diaryEntries)
    .where(and(eq(diaryEntries.userId, user.id), eq(diaryEntries.importId, row.id)))
    .returning({ id: diaryEntries.id });
  const removedWatchlist = await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, user.id), eq(watchlist.importId, row.id)))
    .returning({ id: watchlist.id });

  await db.update(imports).set({ status: "undone" }).where(eq(imports.id, row.id));

  return NextResponse.json({
    entries: removedEntries.length,
    watchlist: removedWatchlist.length,
  });
}
