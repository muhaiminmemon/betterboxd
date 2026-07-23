import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  displayName: z.string().max(60).nullable().optional(),
  bio: z.string().max(1000).nullable().optional(),
  privacy: z.enum(["public", "friends", "private"]).optional(),
  commentPermission: z.enum(["anyone", "friends", "off"]).optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (Object.values(parsed.data).every((v) => v === undefined)) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  await db.update(users).set(parsed.data).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
