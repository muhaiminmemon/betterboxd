"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/library", label: "Library" },
  { href: "/diary", label: "Diary" },
  { href: "/watchlist", label: "Queue" },
  { href: "/lists", label: "Lists" },
  { href: "/friends", label: "Friends" },
];

/**
 * Thumb-reachable navigation on phones. Hidden from `sm` up, where the top bar
 * has room for the full set of links.
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-seam bg-[rgba(20,20,23,.97)] px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur sm:hidden"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center gap-1.5 px-2 py-0.5"
          >
            <span
              aria-hidden
              className={`size-[5px] rounded-full transition-colors ${
                active ? "bg-beam" : "bg-transparent"
              }`}
            />
            <span className={`text-[10px] ${active ? "text-paper" : "text-ash"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
