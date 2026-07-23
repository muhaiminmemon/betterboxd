/** Ratings are tenths (10..100) end to end; formatting is the only float math. */
export function formatTenths(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

/** "8", "8.7", "10" → tenths; anything else → null. */
export function parseRatingInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d{1,2}([.,]\d)?$/.test(trimmed)) return null;
  const n = parseFloat(trimmed.replace(",", "."));
  if (!isFinite(n) || n < 1 || n > 10) return null;
  return Math.round(n * 10);
}

export const RATING_ANCHORS: { range: string; meaning: string }[] = [
  { range: "9.0–10.0", meaning: "Exceptional — a personal favourite" },
  { range: "8.0–8.9", meaning: "Great" },
  { range: "7.0–7.9", meaning: "Good" },
  { range: "6.0–6.9", meaning: "Decent" },
  { range: "5.0–5.9", meaning: "Mixed" },
  { range: "4.0–4.9", meaning: "Disliked" },
  { range: "1.0–3.9", meaning: "Strongly disliked" },
];
