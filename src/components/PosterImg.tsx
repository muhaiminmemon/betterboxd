import Image from "next/image";
import { posterUrl } from "@/lib/tmdb";

type Props = {
  posterPath: string | null;
  title: string;
  size?: "w154" | "w342" | "w500";
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export default function PosterImg({
  posterPath,
  title,
  size = "w342",
  className = "",
  sizes = "154px",
  priority,
}: Props) {
  const url = posterUrl(posterPath, size);
  if (!url) {
    return (
      <div
        role="img"
        aria-label={`${title} — no poster available`}
        className={`bg-tray text-ash flex items-center justify-center overflow-hidden ${className}`}
      >
        <span className="display text-lg px-1 text-center leading-tight line-clamp-3">
          {title}
        </span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-tray ${className}`}>
      <Image
        src={url}
        alt={`Poster for ${title}`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
