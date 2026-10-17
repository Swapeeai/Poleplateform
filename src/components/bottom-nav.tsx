"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

const TABS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/ask", label: "Ask", icon: "?" },
  { href: "/moves", label: "Moves", icon: "◎" },
  { href: "/play", label: "Play", icon: "▶" },
  { href: "/courses", label: "Courses", icon: "★" },
] as const

/** Tab bar fixed to the bottom of the screen, where a thumb reaches on a phone. */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-xs",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                <span aria-hidden className="text-lg leading-none">
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
