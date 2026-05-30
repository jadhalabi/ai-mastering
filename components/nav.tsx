'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function Nav() {
  const path = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [path])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const links = [
    { href: '/mix', label: 'Mix' },
    { href: '/master', label: 'Master' },
    { href: '/dashboard', label: 'Dashboard' },
    ...(user?.email === 'jad.halabi.123@gmail.com' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-8 py-4 bg-[#08080E]/90 backdrop-blur-xl border-b border-white/5">
        <Link href="/" className="font-heading text-[#DEB04A] font-bold tracking-widest text-sm uppercase">
          MasterAI
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${
                path === l.href ? 'text-[#DEB04A]' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className={`text-sm font-medium transition-colors ${path === '/settings' ? 'text-[#DEB04A]' : 'text-white/40 hover:text-white/70'}`}
              >
                {user.email?.split('@')[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-white/10 text-white/40 text-sm font-medium rounded-xl hover:border-white/20 hover:text-white/60 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors">
                Sign In
              </Link>
              <Link
                href="/master"
                className="px-4 py-2 bg-[#DEB04A] text-black text-sm font-heading font-semibold rounded-xl hover:bg-[#E8C060] transition-colors shadow-[0_0_16px_rgba(222,176,74,0.25)]"
              >
                Master Free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span className={`block w-5 h-0.5 bg-white/60 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white/60 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white/60 transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed top-[57px] left-0 right-0 z-40 bg-[#08080E]/98 backdrop-blur-xl border-b border-white/5 px-6 py-6 flex flex-col gap-5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-base font-medium transition-colors ${
                path === l.href ? 'text-[#DEB04A]' : 'text-white/50'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-white/5 pt-5 flex flex-col gap-3">
            {user ? (
              <>
                <Link href="/settings" className="text-base text-white/50">{user.email}</Link>
                <button onClick={handleLogout} className="text-left text-base text-white/40">Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-base text-white/50">Sign In</Link>
                <Link href="/master" className="px-5 py-3 bg-[#DEB04A] text-black font-heading font-semibold rounded-xl text-center text-sm">
                  Master Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
