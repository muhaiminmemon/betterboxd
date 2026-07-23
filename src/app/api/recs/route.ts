import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { recommendForPair } from "@/lib/recs";
import { areFriends } from "@/lib/social";

const schema = z.object({ friend: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const friend = (
    await db
      .select()
      .from(users)
      .where(eq(users.username, parsed.data.friend.toLowerCase()))
      .limit(1)
  )[0];
  if (!friend || !(await areFriends(user.id, friend.id))) {
    return NextResponse.json(
      { error: "You can only do this with a friend. Send them your invite link first." },
      { status: 403 },
    );
  }

  const result = await recommendForPair(user, friend);
  return NextResponse.json(result);
}
