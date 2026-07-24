import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listItems } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { canEdit, roleIn } from "@/lib/lists";

const schema = z.object({ orderedFilmIds: z.array(z.string().uuid()).max(2000) });

/** Persists the order a drag produced. Positions are the array indices. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;

  if (!canEdit(await roleIn(id, user.id))) {
    return NextResponse.json({ error: "You can't reorder this list." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  await db.transaction(async (tx) => {
    for (const [i, filmId] of parsed.data.orderedFilmIds.entries()) {
      await tx
        .update(listItems)
        .set({ position: i })
        .where(and(eq(listItems.listId, id), eq(listItems.filmId, filmId)));
    }
  });

  return NextResponse.json({ ok: true });
}
