import Papa from "papaparse";

export type LetterboxdKind = "diary" | "ratings" | "watched" | "watchlist";

export type ImportRow = {
  /** stable key within one import: kind + line number */
  key: string;
  kind: LetterboxdKind;
  name: string;
  year: number | null;
  uri: string | null;
  /** rating in tenths (10..100), already converted from stars × 2 */
  rating: number | null;
  watchedOn: string | null;
  rewatch: boolean;
};

/**
 * Letterboxd writes plain YYYY-MM-DD. Anything else is dropped rather than
 * handed to Postgres, which would reject the whole insert.
 */
function isoDate(raw: string | undefined): string | null {
  const s = raw?.trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export function detectKind(headers: string[], filename: string): LetterboxdKind | null {
  const set = new Set(headers);
  if (set.has("Watched Date")) return "diary";
  if (set.has("Rating") && !set.has("Watched Date")) return "ratings";
  if (set.has("Name") && set.has("Year")) {
    const f = filename.toLowerCase();
    if (f.includes("watchlist")) return "watchlist";
    return "watched";
  }
  return null;
}

/** Letterboxd stars (0.5..5) → tenths (10..100). 4★ → 80 → “8.0”. */
export function starsToTenths(stars: string | number | null | undefined): number | null {
  if (stars === null || stars === undefined || stars === "") return null;
  const n = typeof stars === "number" ? stars : parseFloat(stars);
  if (!isFinite(n) || n <= 0) return null;
  const tenths = Math.round(n * 20);
  return Math.min(100, Math.max(10, tenths));
}

/**
 * Tenths (10..100) → Letterboxd stars, rounded to the nearest half star.
 * The inverse of `starsToTenths`, and lossy by design: Letterboxd only stores
 * half-star increments, so 8.7 lands on 4.5★ and 6.4 on 3★.
 */
export function tenthsToStars(tenths: number): number {
  const stars = Math.round(tenths / 10) / 2;
  return Math.min(5, Math.max(0.5, stars));
}

/** Letterboxd's CSV wants "4.5", not "4.50". */
export function formatStars(tenths: number): string {
  const stars = tenthsToStars(tenths);
  return Number.isInteger(stars) ? String(stars) : stars.toFixed(1);
}

export function parseLetterboxdCsv(text: string, filename: string): { kind: LetterboxdKind; rows: ImportRow[] } | null {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const headers = parsed.meta.fields ?? [];
  const kind = detectKind(headers, filename);
  if (!kind) return null;

  const rows: ImportRow[] = parsed.data.map((r, i) => ({
    key: `${kind}:${i}`,
    kind,
    name: (r["Name"] ?? "").trim(),
    year: r["Year"] ? Number(r["Year"]) || null : null,
    uri: r["Letterboxd URI"]?.trim() || null,
    rating: kind === "diary" || kind === "ratings" ? starsToTenths(r["Rating"]) : null,
    // diary.csv has both: "Watched Date" is when you saw it, "Date" when you
    // logged it. ratings.csv and watched.csv only carry "Date", which is the
    // best date available for those rows, so use it rather than importing
    // everything undated.
    watchedOn:
      kind === "watchlist"
        ? null
        : kind === "diary"
          ? isoDate(r["Watched Date"]) ?? isoDate(r["Date"])
          : isoDate(r["Date"]),
    rewatch: kind === "diary" ? (r["Rewatch"] ?? "").trim().toLowerCase() === "yes" : false,
  }));

  return { kind, rows: rows.filter((r) => r.name) };
}

/** Idempotency key: the same source row can never import twice. */
export function sourceKey(row: ImportRow): string {
  return [
    row.kind,
    row.uri ?? `${row.name}|${row.year ?? ""}`,
    row.watchedOn ?? "",
    row.rating ?? "",
  ].join("::");
}
