import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { blockedIdsFor } from "@/lib/social";

/** Find people by username or display name. Typo-tolerant via pg_trgm. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const viewer = await getSessionUser();
  const blocked = viewer ? await blockedIdsFor(viewer.id) : new Set<string>();

  const pattern = `%${q.toLowerCase()}%`;
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(users)
    .where(
      sql`(${users.username} ilike ${pattern}
        or ${users.displayName} ilike ${pattern}
        or similarity(${users.username}, ${q.toLowerCase()}) > 0.3)`,
    )
    .orderBy(sql`${users.username} ilike ${pattern} desc, similarity(${users.username}, ${q.toLowerCase()}) desc`)
    .limit(8);

  return NextResponse.json({
    results: rows.filter((r) => r.id !== viewer?.id && !blocked.has(r.id)),
  });
}
