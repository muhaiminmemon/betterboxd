import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listItems } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { canEdit, roleIn } from "@/lib/lists";

const schema = z.object({ filmId: z.string().uuid() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;

  if (!canEdit(await roleIn(id, user.id))) {
    return NextResponse.json({ error: "You can't add to this list." }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  await db
    .insert(listItems)
    .values({ listId: id, filmId: parsed.data.filmId, addedBy: user.id })
    .onConflictDoNothing();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;

  if (!canEdit(await roleIn(id, user.id))) {
    return NextResponse.json({ error: "You can't edit this list." }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  await db
    .delete(listItems)
    .where(and(eq(listItems.listId, id), eq(listItems.filmId, parsed.data.filmId)));
  return NextResponse.json({ ok: true });
}
