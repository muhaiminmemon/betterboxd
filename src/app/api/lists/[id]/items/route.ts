import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listItems } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { canEdit, roleIn } from "@/lib/lists";

const schema = z.object({ filmId: z.string().uuid() });

/** One film, or a whole selection from the library in a single trip. */
const addSchema = z.union([
  schema.transform((v) => [v.filmId]),
  z.object({ filmIds: z.array(z.string().uuid()).min(1).max(500) }).transform((v) => v.filmIds),
]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;

  if (!canEdit(await roleIn(id, user.id))) {
    return NextResponse.json({ error: "You can't add to this list." }, { status: 403 });
  }
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const filmIds = [...new Set(parsed.data)];

  // append after whatever is already there, keeping the chosen order
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${listItems.position}), -1)` })
    .from(listItems)
    .where(eq(listItems.listId, id));

  const added = await db
    .insert(listItems)
    .values(
      filmIds.map((filmId, i) => ({
        listId: id,
        filmId,
        addedBy: user.id,
        position: Number(max) + 1 + i,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: listItems.id });

  return NextResponse.json({ ok: true, added: added.length });
}

const noteSchema = z.object({
  filmId: z.string().uuid(),
  note: z.string().max(500).nullable(),
});

/** Why this film is on the list, written by whoever is editing. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;

  if (!canEdit(await roleIn(id, user.id))) {
    return NextResponse.json({ error: "You can't edit this list." }, { status: 403 });
  }
  const parsed = noteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const updated = await db
    .update(listItems)
    .set({ note: parsed.data.note?.trim() || null })
    .where(and(eq(listItems.listId, id), eq(listItems.filmId, parsed.data.filmId)))
    .returning({ id: listItems.id });
  if (!updated[0]) return NextResponse.json({ error: "Not on this list." }, { status: 404 });

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
