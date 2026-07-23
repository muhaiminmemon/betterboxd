import { formatTenths } from "@/lib/format";

type Point = { watchedOn: string; rating: number };

/**
 * How a rating moved over time: small, precise, no decoration.
 * Renders only when there are two or more dated, rated viewings.
 */
export default function RewatchTimeline({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  const w = 320;
  const h = 72;
  const padX = 14;
  const padY = 18;

  const times = points.map((p) => new Date(p.watchedOn).getTime());
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = max - min || 1;

  const ratings = points.map((p) => p.rating);
  const lo = Math.min(...ratings);
  const hi = Math.max(...ratings);
  const rSpan = Math.max(hi - lo, 5); // at least half a point of vertical room

  const coords = points.map((p, i) => ({
    x: padX + ((times[i] - min) / span) * (w - padX * 2),
    y: h - padY - ((p.rating - lo) / rSpan) * (h - padY * 2),
    p,
  }));

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <figure>
      <figcaption className="mb-1 text-xs uppercase tracking-wide text-ash">
        Your rating over time
      </figcaption>
      <svg
        viewBox={`0 0 ${w} ${h + 14}`}
        className="w-full max-w-sm"
        role="img"
        aria-label={`Rating history: ${points
          .map((p) => `${formatTenths(p.rating)} on ${p.watchedOn}`)
          .join(", ")}`}
      >
        <path d={path} fill="none" stroke="#2a2a31" strokeWidth="1.5" />
        {coords.map((c) => (
          <g key={c.p.watchedOn + c.p.rating}>
            <circle cx={c.x} cy={c.y} r="3" fill="#eceae6" />
            <text
              x={c.x}
              y={c.y - 7}
              textAnchor="middle"
              className="num"
              fill="#eceae6"
              fontSize="11"
            >
              {formatTenths(c.p.rating)}
            </text>
            <text x={c.x} y={h + 10} textAnchor="middle" fill="#9a9aa3" fontSize="9">
              {new Date(c.p.watchedOn).getFullYear()}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
