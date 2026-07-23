import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lists } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { roleIn } from "@/lib/lists";

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;

  if ((await roleIn(id, user.id)) !== "owner") {
    return NextResponse.json({ error: "Only the owner can change the list." }, { status: 403 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const updated = await db.update(lists).set(parsed.data).where(eq(lists.id, id)).returning();
  return NextResponse.json({ list: updated[0] });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;

  if ((await roleIn(id, user.id)) !== "owner") {
    return NextResponse.json({ error: "Only the owner can delete the list." }, { status: 403 });
  }
  await db.delete(lists).where(eq(lists.id, id));
  return NextResponse.json({ ok: true });
}
