'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { StudioVisual } from '@/components/ui/studio-visual'
import { Spotlight } from '@/components/ui/spotlight'

const GENRE_PRESETS = ['Hip-Hop', 'EDM', 'Pop', 'R&B', 'Podcast', 'Rock', 'Lo-Fi', 'Classical']
const PLATFORM_PRESETS = [
  { label: 'Spotify', lufs: '-14 LUFS' },
  { label: 'Apple Music', lufs: '-16 LUFS' },
  { label: 'YouTube', lufs: '-14 LUFS' },
  { label: 'SoundCloud', lufs: '-11 LUFS' },
  { label: 'Tidal', lufs: '-14 LUFS' },
]

const STEPS = [
  { n: '01', icon: '⬆', title: 'Upload Your Track', desc: 'Drop any mp3, wav, or flac file — we handle the format automatically.' },
  { n: '02', icon: '🎵', title: 'Drop a Reference', desc: 'Pick a song that sounds the way you want yours to — we analyze it precisely.' },
  { n: '03', icon: '⬇', title: 'Download Your Master', desc: 'Get a 24-bit WAV back in seconds, matched to your reference.' },
]

const TESTIMONIALS = [
  { quote: "I sent this to my distributor and they thought I paid for a real mastering session. It cost me nothing.", name: "Marcus T.", genre: "R&B / Soul" },
  { quote: "My EDM tracks used to sound flat on streaming. Now they hit exactly where they should.", name: "Lena V.", genre: "EDM / Electronic" },
  { quote: "As a podcast producer I needed fast and consistent. This nails it every single time.", name: "James O.", genre: "Podcast" },
]

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    features: ['1 master per month', 'Standard -14 LUFS', 'WAV download'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$12/mo',
    features: ['Unlimited masters', 'Reference matching', 'Genre & platform presets', 'Analysis PDF report', 'Revision history'],
    cta: 'Start Pro',
    highlight: true,
  },
  {
    name: 'Studio',
    price: '$49/mo',
    features: ['Everything in Pro', 'Bulk upload', 'API access', 'White label option', 'Priority processing'],
    cta: 'Go Studio',
    highlight: false,
  },
]

export default function Home() {
  return (
    <main className="pt-16">
      {/* grain */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }} />

      {/* HERO */}
      <section className="relative min-h-[calc(100vh-64px)] flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 flex gap-0">
          {/* Left — studio visual */}
          <div className="w-[40%] relative flex flex-col items-center justify-center">
            <Spotlight className="-top-40 left-0 w-full h-full" fill="rgb(201,168,76)" />
            <div className="relative w-full h-[580px]">
              <StudioVisual />
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none" />
            </div>
            <p className="tracking-widest text-xs text-[#C9A84C]/60 uppercase mt-2 font-medium">AI Mastering Engine</p>
          </div>

          {/* Right — copy */}
          <div className="w-[60%] flex flex-col justify-center pl-12 pr-4">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <h1 className="text-6xl font-bold leading-tight mb-4">
                Your Track.<br />
                <span className="text-[#C9A84C]">Mastered by AI.</span>
              </h1>
              <p className="text-[#888] text-xl mb-10 max-w-md">
                Upload your track, drop a reference, and get a professional master in seconds — not days.
              </p>
              <div className="flex gap-4 mb-12">
                <Link href="/master" className="relative px-8 py-4 bg-[#C9A84C] text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors overflow-hidden group">
                  <span className="relative z-10">Master a Track Free</span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                </Link>
                <button className="px-8 py-4 border border-white/15 text-white/70 font-semibold rounded-xl hover:border-[#C9A84C]/40 hover:text-white transition-colors">
                  Hear the Difference
                </button>
              </div>
              <div className="flex gap-10">
                {[['10,000+', 'Tracks Mastered'], ['Trusted by', 'Independent Artists'], ['Sounds Like', 'a $200 Master']].map(([v, l]) => (
                  <div key={l}>
                    <p className="text-[#C9A84C] font-bold text-xl">{v}</p>
                    <p className="text-[#888] text-sm">{l}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#C9A84C] tracking-widest text-xs uppercase mb-3">Process</p>
          <h2 className="text-4xl font-bold mb-16">How It Works</h2>
          <div className="grid grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-[#111] border border-[#222] rounded-2xl p-8 hover:border-[#C9A84C]/20 hover:shadow-[0_0_20px_rgba(201,168,76,0.05)] transition-all">
                <p className="text-[#C9A84C]/40 text-4xl font-bold mb-4">{s.n}</p>
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-[#888] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GENRE & PLATFORM PRESETS */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#C9A84C] tracking-widest text-xs uppercase mb-3">Presets</p>
          <h2 className="text-4xl font-bold mb-4">Built for Every Format</h2>
          <p className="text-[#888] mb-12">Pick your genre and platform — we hit the right target every time.</p>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {GENRE_PRESETS.map((g) => (
                <Link key={g} href={`/master?genre=${g.toLowerCase().replace('-', '_')}`}
                  className="px-4 py-2 rounded-full bg-[#111] border border-[#222] text-white/60 text-sm hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-all">
                  {g}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_PRESETS.map((p) => (
                <Link key={p.label} href={`/master?platform=${p.label.toLowerCase().replace(' ', '_')}`}
                  className="px-4 py-2 rounded-full bg-[#111] border border-[#222] text-white/60 text-sm hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-all">
                  {p.label} <span className="text-[#888] ml-1">{p.lufs}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#C9A84C] tracking-widest text-xs uppercase mb-3">Pricing</p>
          <h2 className="text-4xl font-bold mb-16">Simple, Honest Pricing</h2>
          <div className="grid grid-cols-3 gap-6">
            {PRICING.map((tier) => (
              <div key={tier.name} className={`relative rounded-2xl p-8 ${tier.highlight ? 'bg-[#111] border-2 border-[#C9A84C]/60 shadow-[0_0_30px_rgba(201,168,76,0.1)]' : 'bg-[#111] border border-[#222]'}`}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#C9A84C] text-black text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-white font-bold text-xl mb-1">{tier.name}</h3>
                <p className="text-[#C9A84C] text-3xl font-bold mb-6">{tier.price}</p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[#888] text-sm">
                      <span className="text-[#C9A84C]">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/master" className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${tier.highlight ? 'bg-[#C9A84C] text-black hover:bg-amber-400' : 'border border-[#333] text-white/60 hover:border-[#C9A84C]/40 hover:text-white'}`}>
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#C9A84C] tracking-widest text-xs uppercase mb-3">Artists</p>
          <h2 className="text-4xl font-bold mb-16">What Artists Are Saying</h2>
          <div className="grid grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-[#111] border border-[#222] rounded-2xl p-8 hover:border-[#C9A84C]/20 transition-all">
                <p className="text-white/70 text-sm leading-relaxed mb-6">"{t.quote}"</p>
                <p className="text-white font-semibold text-sm">{t.name}</p>
                <p className="text-[#888] text-xs mt-1">{t.genre}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-[#C9A84C] font-bold tracking-widest text-sm uppercase">MasterAI</p>
            <p className="text-[#888] text-xs mt-1">Professional mastering, instantly.</p>
          </div>
          <div className="flex gap-6 text-[#888] text-sm">
            {['Home', 'Pricing', 'Dashboard', 'Privacy', 'Terms'].map((l) => (
              <Link key={l} href="/" className="hover:text-white transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  )
}
