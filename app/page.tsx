'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { ShieldCheckIcon, ZapIcon, MicVocalIcon, WavesIcon } from 'lucide-react'
import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BorderTrail } from '@/components/ui/border-trail'

// Shader background — client only (WebGL)
const MeshGradient = dynamic(
  () => import('@paper-design/shaders-react').then((m) => m.MeshGradient),
  { ssr: false }
)

// ── Data ────────────────────────────────────────────────────────────────────

const STEPS = [
  { n: '01', icon: <WavesIcon className="w-6 h-6" />, title: 'Upload Your Track', desc: 'Drop any MP3, WAV, or FLAC — we handle every format automatically.' },
  { n: '02', icon: <MicVocalIcon className="w-6 h-6" />, title: 'Drop a Reference', desc: 'Pick a song that sounds the way you want — we analyze it precisely.' },
  { n: '03', icon: <ZapIcon className="w-6 h-6" />, title: 'Download Your Master', desc: 'Get a 24-bit WAV back in seconds, matched to your reference track.' },
]

const TESTIMONIALS = [
  { quote: "I sent this to my distributor and they thought I paid for a real mastering session.", name: "Marcus T.", genre: "R&B / Soul" },
  { quote: "My EDM tracks used to sound flat on streaming. Now they hit exactly where they should.", name: "Lena V.", genre: "EDM / Electronic" },
  { quote: "As a podcast producer I needed fast and consistent. This nails it every single time.", name: "James O.", genre: "Podcast" },
]

const GENRE_PRESETS = ['Hip-Hop', 'EDM', 'Pop', 'R&B', 'House', 'Afro House', 'Deep House', 'Rock', 'Lo-Fi', 'Classical']
const PLATFORM_PRESETS = [
  { label: 'Spotify', lufs: '-14 LUFS' }, { label: 'Apple Music', lufs: '-16 LUFS' },
  { label: 'YouTube', lufs: '-14 LUFS' }, { label: 'SoundCloud', lufs: '-11 LUFS' },
  { label: 'Tidal', lufs: '-14 LUFS' },
]

// Pre-computed — avoids server/client float precision mismatch (hydration error)
const PREVIEW_BARS = Array.from({ length: 90 }, (_, i) =>
  Math.round((20 + Math.abs(Math.sin(i * 0.4) * 28 + Math.cos(i * 0.25) * 18)) * 100) / 100
)

// ── App preview mock (inside ContainerScroll) ────────────────────────────────

function AppPreview() {
  const bars = PREVIEW_BARS
  return (
    <div className="w-full h-full bg-[#0B0A16] p-5 flex flex-col gap-4 font-sans">
      {/* Window chrome */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400/50" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
        <div className="w-3 h-3 rounded-full bg-green-400/50" />
        <div className="ml-3 px-3 py-1 rounded-md bg-white/5 text-white/20 text-[10px] flex-1 truncate">
          masterai.app/master
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1 bg-[#100F1E] rounded-xl border border-white/5 p-5 flex flex-col gap-4">
        <p className="text-[#DEB04A] text-[10px] tracking-widest uppercase">Studio</p>
        <p className="font-heading text-white text-xl font-bold leading-tight">Master Your Track</p>
        {/* Waveform */}
        <div className="bg-[#0D0C1A] rounded-lg border border-white/5 p-3">
          <div className="flex items-center gap-px h-10">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{ height: `${h}%`, backgroundColor: '#DEB04A', opacity: 0.5 + (h / 46) * 0.5 }}
              />
            ))}
          </div>
          <p className="text-[#DEB04A] text-[10px] mt-2 truncate">HALABi - Don&apos;t Let Go.wav</p>
        </div>
        {/* Genre pills */}
        <div className="flex flex-wrap gap-1.5">
          {['Hip-Hop', 'EDM', 'Pop', 'House', 'R&B', 'Rock'].map((g) => (
            <div key={g} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/40 text-[9px]">
              {g}
            </div>
          ))}
        </div>
        {/* Platform pills */}
        <div className="flex flex-wrap gap-1.5">
          {['Spotify -14', 'Apple Music -16', 'YouTube -14'].map((p) => (
            <div key={p} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/30 text-[9px]">
              {p}
            </div>
          ))}
        </div>
        {/* CTA */}
        <div className="mt-auto bg-[#DEB04A] rounded-xl py-3 text-center text-black font-bold text-sm font-heading">
          Master Track
        </div>
      </div>
    </div>
  )
}

// ── Pricing ──────────────────────────────────────────────────────────────────

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    originalPrice: null,
    discount: null,
    description: 'Try it out, no credit card needed.',
    features: ['1 master per month', 'Standard -14 LUFS', 'WAV download', 'Mix Prep tool'],
    cta: 'Get Started',
    highlight: false,
    href: '/master',
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    originalPrice: '$12',
    discount: '25% off',
    description: 'For independent artists who release regularly.',
    features: ['Unlimited masters', 'Reference matching', 'All genre & platform presets', 'Mix Prep + Mastering flow', 'Analysis report'],
    cta: 'Start Pro',
    highlight: true,
    href: '/master',
  },
  {
    name: 'Studio',
    price: '$39',
    period: '/month',
    originalPrice: '$49',
    discount: '20% off',
    description: 'For studios, labels, and high-volume creators.',
    features: ['Everything in Pro', 'Bulk upload', 'API access', 'White label option', 'Priority processing', 'Dedicated support'],
    cta: 'Go Studio',
    highlight: false,
    href: '/master',
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="pt-16 overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[calc(100vh-64px)] flex items-center justify-center overflow-hidden">
        {/* Shader background */}
        <div className="absolute inset-0 z-0">
          <MeshGradient
            className="w-full h-full"
            colors={['#08080E', '#140F28', '#1A1205', '#0E1420']}
            speed={0.4}
          />
        </div>

        {/* Grain */}
        <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }}
        />

        {/* Radial glow */}
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,rgba(222,176,74,0.08),transparent)]" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#DEB04A]/25 bg-[#DEB04A]/8 text-[#DEB04A] text-xs tracking-widest uppercase mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DEB04A] animate-pulse" />
              AI Mastering Studio
            </div>

            <h1 className="font-heading text-5xl md:text-8xl font-bold leading-[0.95] tracking-tight mb-6">
              Your Track.<br />
              <span className="text-[#DEB04A]">Mastered by AI.</span>
            </h1>

            <p className="text-white/50 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Upload your track, drop a reference, and get a professional master in seconds — not days. Mix and master in one seamless flow.
            </p>

            <div className="flex flex-wrap gap-4 justify-center mb-14">
              <Link
                href="/master"
                className="relative px-8 py-4 bg-[#DEB04A] text-black font-heading font-bold text-base rounded-2xl hover:bg-[#E8C060] transition-all overflow-hidden group shadow-[0_0_30px_rgba(222,176,74,0.2)]"
              >
                <span className="relative z-10">Master a Track Free</span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </Link>
              <Link
                href="/mix"
                className="px-8 py-4 border border-white/15 text-white/70 font-heading font-semibold text-base rounded-2xl hover:border-[#DEB04A]/40 hover:text-white hover:bg-white/5 transition-all"
              >
                Mix Prep →
              </Link>
            </div>

            <div className="flex flex-wrap gap-8 justify-center">
              {[['10,000+', 'Tracks Mastered'], ['Trusted by', 'Independent Artists'], ['Sounds Like', 'a $200 Master']].map(([v, l]) => (
                <div key={l} className="text-center">
                  <p className="font-heading text-[#DEB04A] font-bold text-xl">{v}</p>
                  <p className="text-white/40 text-sm mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CONTAINER SCROLL ─────────────────────────────────────────────── */}
      <section className="bg-[#08080E]">
        <ContainerScroll
          titleComponent={
            <div className="mb-6">
              <p className="text-[#DEB04A] text-xs tracking-widest uppercase mb-3">The Studio</p>
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-white mb-3">
                Professional quality.<br />
                <span className="text-white/50">In your browser.</span>
              </h2>
              <p className="text-white/40 text-base max-w-lg mx-auto">
                Every tool a mastering engineer uses — EQ matching, loudness normalization, dynamic control — powered by AI.
              </p>
            </div>
          }
        >
          <AppPreview />
        </ContainerScroll>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-white/5 bg-[#08080E]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}
          >
            <p className="text-[#DEB04A] tracking-widest text-xs uppercase mb-3">Process</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-16">How It Works</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }} viewport={{ once: true }}
                className="group bg-[#0F0E1C] border border-white/8 rounded-2xl p-8 hover:border-[#DEB04A]/25 hover:shadow-[0_0_30px_rgba(222,176,74,0.06)] transition-all"
              >
                <p className="font-heading text-[#DEB04A]/30 text-5xl font-black mb-5">{s.n}</p>
                <div className="text-[#DEB04A]/70 mb-4">{s.icon}</div>
                <h3 className="font-heading text-white font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRESETS ──────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-white/5 bg-[#08080E]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}
          >
            <p className="text-[#DEB04A] tracking-widest text-xs uppercase mb-3">Presets</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-3">Built for Every Format</h2>
            <p className="text-white/40 mb-12">Pick your genre and platform — we hit the right target every time.</p>
          </motion.div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {GENRE_PRESETS.map((g) => (
                <Link key={g} href={`/master?genre=${g.toLowerCase().replace(/ /g, '_')}`}
                  className="px-4 py-2 rounded-full bg-[#0F0E1C] border border-white/8 text-white/50 text-sm hover:border-[#DEB04A]/40 hover:text-[#DEB04A] hover:bg-[#DEB04A]/5 transition-all">
                  {g}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_PRESETS.map((p) => (
                <Link key={p.label} href={`/master?platform=${p.label.toLowerCase().replace(/ /g, '_')}`}
                  className="px-4 py-2 rounded-full bg-[#0F0E1C] border border-white/8 text-white/50 text-sm hover:border-[#DEB04A]/40 hover:text-[#DEB04A] hover:bg-[#DEB04A]/5 transition-all">
                  {p.label} <span className="text-white/30 ml-1">{p.lufs}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-6 border-t border-white/5 bg-[#08080E] relative overflow-hidden">
        {/* Grid background */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[#DEB04A] tracking-widest text-xs uppercase mb-3">Pricing</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">Simple, Honest Pricing</h2>
            <p className="text-white/40 max-w-md mx-auto">Start free. Upgrade when you need more. Cancel anytime.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }} viewport={{ once: true }}
                className={`relative rounded-2xl p-7 flex flex-col ${
                  tier.highlight
                    ? 'bg-[#0F0E1C] border-2 border-[#DEB04A]/50 shadow-[0_0_40px_rgba(222,176,74,0.12)]'
                    : 'bg-[#0F0E1C] border border-white/8'
                }`}
              >
                {tier.highlight && <BorderTrail size={80} />}
                {tier.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-heading text-white font-bold text-xl mb-1">{tier.name}</h3>
                  <p className="text-white/35 text-sm">{tier.description}</p>
                </div>

                <div className="flex items-end gap-1 mb-6">
                  <span className="text-white/40 text-lg self-start mt-2">$</span>
                  <span className="font-heading text-5xl font-black text-white leading-none">
                    {tier.price.replace('$', '')}
                  </span>
                  <span className="text-white/40 text-sm mb-1">{tier.period}</span>
                  {tier.discount && (
                    <Badge variant="secondary" className="ml-2 mb-1">{tier.discount}</Badge>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-white/60 text-sm">
                      <span className="text-[#DEB04A] text-base leading-none">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Button variant={tier.highlight ? 'default' : 'outline'} asChild className="w-full py-5 font-heading font-semibold">
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mt-8 text-white/30 text-sm">
            <ShieldCheckIcon className="w-4 h-4" />
            <span>No hidden fees. Cancel anytime. Download is always 24-bit WAV.</span>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-white/5 bg-[#08080E]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}
          >
            <p className="text-[#DEB04A] tracking-widest text-xs uppercase mb-3">Artists</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-16">What Artists Are Saying</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-[#0F0E1C] border border-white/8 rounded-2xl p-8 hover:border-[#DEB04A]/20 hover:shadow-[0_0_20px_rgba(222,176,74,0.05)] transition-all"
              >
                <p className="text-[#DEB04A]/60 text-2xl mb-4 font-heading">"</p>
                <p className="text-white/65 text-sm leading-relaxed mb-6 italic">{t.quote}</p>
                <div className="border-t border-white/5 pt-4">
                  <p className="text-white font-semibold text-sm font-heading">{t.name}</p>
                  <p className="text-white/35 text-xs mt-0.5">{t.genre}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-14 px-6 bg-[#08080E]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="font-heading text-[#DEB04A] font-bold tracking-widest text-sm uppercase">MasterAI</p>
            <p className="text-white/30 text-xs mt-1">Professional mastering, instantly.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-white/35 text-sm">
            {[['Home', '/'], ['Mix', '/mix'], ['Master', '/master'], ['Dashboard', '/dashboard'], ['Pricing', '/#pricing']].map(([l, h]) => (
              <Link key={l} href={h} className="hover:text-white/70 transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  )
}
