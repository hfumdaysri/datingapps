"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gamepad2, CalendarHeart, BookHeart } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Beranda", Icon: Home },
  { href: "/games", label: "Game", Icon: Gamepad2 },
  { href: "/dates", label: "Kencan", Icon: CalendarHeart },
  { href: "/memories", label: "Kenangan", Icon: BookHeart },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-blush bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:border-0 md:border-b md:bg-transparent"
    >
      <ul className="mx-auto flex max-w-4xl justify-around md:justify-start md:gap-2 md:px-4">
        {items.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-3 text-xs font-semibold md:flex-row md:gap-2 md:text-sm",
                  active ? "text-rose" : "text-plum/80 hover:text-plum",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
