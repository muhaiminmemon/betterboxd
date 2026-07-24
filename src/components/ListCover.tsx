import { posterUrl } from "@/lib/tmdb-urls";

type Props = {
  posterPaths: (string | null)[];
  /** `full` fills its grid cell; the others are fixed squares */
  size?: "sm" | "lg" | "full";
  className?: string;
};

/**
 * A list's face, built from the first four posters it holds. No upload, no
 * empty placeholder art: the films are the cover.
 */
export default function ListCover({ posterPaths, size = "sm", className = "" }: Props) {
  const slots = posterPaths.slice(0, 4);
  const box = size === "full" ? "w-full" : size === "lg" ? "w-28" : "w-16";

  if (slots.length === 0) {
    return (
      <div
        aria-hidden
        className={`${box} ${className} aspect-square shrink-0 rounded-lg border border-seam bg-tray`}
      />
    );
  }

  // one poster fills the square; two or more tile into a 2×2
  return (
    <div
      aria-hidden
      className={`${box} ${className} grid aspect-square shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-lg border border-seam bg-seam`}
    >
      {Array.from({ length: 4 }, (_, i) => {
        const path = slots.length === 1 ? slots[0] : slots[i];
        const url = posterUrl(path ?? null, "w154");
        const span = slots.length === 1 ? "col-span-2 row-span-2" : "";
        if (slots.length === 1 && i > 0) return null;
        return url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt=""
            loading="lazy"
            className={`${span} size-full bg-tray object-cover`}
          />
        ) : (
          <span key={i} className={`${span} size-full bg-tray`} />
        );
      })}
    </div>
  );
}
