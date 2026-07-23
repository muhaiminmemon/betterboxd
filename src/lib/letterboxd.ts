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
    watchedOn: kind === "diary" ? r["Watched Date"]?.trim() || null : null,
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
