import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { removeFriendship } from "@/lib/social";

const schema = z.object({ userId: z.string().uuid() });

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  await removeFriendship(user.id, parsed.data.userId);
  return NextResponse.json({ ok: true });
}
