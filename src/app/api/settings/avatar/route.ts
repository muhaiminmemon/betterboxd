import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

// The client resizes to a small square JPEG before sending; this cap is a
// safety net against a client that skips the resize, not the expected size.
const MAX_DATA_URL_LENGTH = 700_000;

const schema = z.object({
  dataUrl: z
    .string()
    .startsWith("data:image/")
    .max(MAX_DATA_URL_LENGTH, "That image is too large."),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Couldn't use that image." },
      { status: 400 },
    );
  }

  await db.update(users).set({ avatarUrl: parsed.data.dataUrl }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  await db.update(users).set({ avatarUrl: null }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
