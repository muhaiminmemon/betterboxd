type Props = {
  avatarUrl: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
};

/** A photo if the person has one, otherwise an initial on a flat circle. */
export default function Avatar({ avatarUrl, name, size = 32, className = "" }: Props) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL or same-origin, not an optimizable remote asset
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover bg-tray ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-tray-2 text-ash ${className}`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
