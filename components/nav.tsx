'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Nav() {
  const path = usePathname()

  const links = [
    { href: '/', label: 'Home' },
    { href: '/master', label: 'Master' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[#080808]/80 backdrop-blur-md border-b border-white/5">
      <Link href="/" className="text-amber-500 font-bold tracking-widest text-sm uppercase">
        MasterAI
      </Link>
      <div className="flex items-center gap-6">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm transition-colors ${
              path === l.href ? 'text-amber-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/master"
          className="px-4 py-2 bg-amber-500 text-black text-sm font-semibold rounded-lg hover:bg-amber-400 transition-colors"
        >
          Master Free
        </Link>
      </div>
    </nav>
  )
}
