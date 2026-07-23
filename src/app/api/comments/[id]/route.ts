import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, diaryEntries } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

/** A comment can be deleted by its author or by the review's author. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;

  const row = (
    await db
      .select({ comment: comments, entryOwner: diaryEntries.userId })
      .from(comments)
      .innerJoin(diaryEntries, eq(diaryEntries.id, comments.entryId))
      .where(eq(comments.id, id))
      .limit(1)
  )[0];
  if (!row) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  if (row.comment.userId !== user.id && row.entryOwner !== user.id) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  await db.delete(comments).where(eq(comments.id, id));
  return NextResponse.json({ ok: true });
}
