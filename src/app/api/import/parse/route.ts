import { NextResponse } from "next/server";
import { db } from "@/db";
import { imports } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { parseLetterboxdCsv } from "@/lib/letterboxd";
import type { ImportPayload } from "@/lib/importer";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "Choose at least one CSV from your Letterboxd export." }, { status: 400 });
  }

  const payload: ImportPayload = { rows: [], matches: {} };
  const filenames: string[] = [];
  const unrecognized: string[] = [];

  for (const file of files) {
    const text = await file.text();
    const parsed = parseLetterboxdCsv(text, file.name);
    if (!parsed) {
      unrecognized.push(file.name);
      continue;
    }
    // re-key rows so multiple files of the same kind can't collide
    const offset = payload.rows.length;
    payload.rows.push(
      ...parsed.rows.map((r, i) => ({ ...r, key: `${r.kind}:${offset + i}` })),
    );
    filenames.push(file.name);
  }

  if (!payload.rows.length) {
    return NextResponse.json(
      {
        error: unrecognized.length
          ? `Couldn't read ${unrecognized.join(", ")}. Upload diary.csv, ratings.csv, watched.csv, or watchlist.csv from your Letterboxd export.`
          : "Those files contained no film rows.",
      },
      { status: 400 },
    );
  }

  const created = await db
    .insert(imports)
    .values({ userId: user.id, filenames, payload })
    .returning({ id: imports.id });

  return NextResponse.json({
    importId: created[0].id,
    rows: payload.rows,
    unrecognized,
  });
}
