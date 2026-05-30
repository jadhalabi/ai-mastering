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

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const links = [
    { href: '/master', label: 'Master' },
    { href: '/dashboard', label: 'Dashboard' },
    ...(user?.email === 'jad.halabi.123@gmail.com' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[#08080E]/85 backdrop-blur-xl border-b border-white/5">
      <Link href="/" className="font-heading text-[#DEB04A] font-bold tracking-widest text-sm uppercase">
        MasterAI
      </Link>
      <div className="flex items-center gap-6">
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
            <Link
              href="/login"
              className="text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
            >
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
    </nav>
  )
}
