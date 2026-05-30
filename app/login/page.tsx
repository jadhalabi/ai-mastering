'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-[#DEB04A] tracking-widest text-xs uppercase mb-3">MasterAI</p>
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-white/35 text-sm mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#0F0E1C] border border-white/8 rounded-2xl p-8 space-y-5">
          <div>
            <label className="text-white/35 text-[10px] uppercase tracking-widest block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-[#0B0A16] border border-white/8 rounded-xl px-4 py-3 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-[#DEB04A]/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-white/35 text-[10px] uppercase tracking-widest block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#0B0A16] border border-white/8 rounded-xl px-4 py-3 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-[#DEB04A]/40 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400/80 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#DEB04A] text-black font-heading font-semibold rounded-xl hover:bg-[#E8C060] transition-colors text-sm shadow-[0_0_20px_rgba(222,176,74,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-white/30 text-sm mt-6">
          No account?{' '}
          <Link href="/signup" className="text-[#DEB04A] hover:text-[#E8C060] transition-colors">
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  )
}
