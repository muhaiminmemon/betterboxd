"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/library", label: "Library" },
  { href: "/diary", label: "Diary" },
  { href: "/feed", label: "Feed" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/lists", label: "Lists" },
  { href: "/friends", label: "Friends" },
  { href: "/import", label: "Import" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-1 text-sm">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-card px-2.5 py-1 transition-colors ${
              active ? "bg-tray-2 text-paper" : "text-ash hover:bg-tray hover:text-paper"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
