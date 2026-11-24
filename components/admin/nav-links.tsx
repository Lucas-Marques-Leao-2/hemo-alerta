"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type NavLink = { href: string; label: string }

// Navegação do painel com destaque da seção atual ("você está aqui").
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {links.map((link) => {
        const active =
          link.href === "/admin" || link.href === "/"
            ? pathname === link.href
            : pathname.startsWith(link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              active
                ? "bg-red-50 font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
