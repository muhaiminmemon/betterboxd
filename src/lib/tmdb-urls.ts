// Client-safe poster URL helper (no server deps).
export const POSTER_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(
  path: string | null | undefined,
  size: "w154" | "w342" | "w500" = "w342",
): string | null {
  return path ? `${POSTER_BASE}/${size}${path}` : null;
}
