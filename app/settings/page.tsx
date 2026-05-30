'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [mastersCount, setMastersCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
    supabase
      .from('masters')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setMastersCount(count ?? 0))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    const supabase = createClient()
    const updates: { email?: string; password?: string } = {}
    const { data: { user } } = await supabase.auth.getUser()
    if (email !== user?.email) updates.email = email
    if (newPassword) updates.password = newPassword
    if (Object.keys(updates).length === 0) {
      setSaveMsg('Nothing to update.')
      setSaving(false)
      return
    }
    const { error } = await supabase.auth.updateUser(updates)
    setSaveMsg(error ? error.message : 'Saved!')
    setSaving(false)
    if (!error) setNewPassword('')
  }

  return (
    <main className="pt-24 pb-16 px-6 min-h-screen">
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }}
      />
      <div className="relative z-10 max-w-2xl mx-auto">
        <p className="text-[#DEB04A] tracking-widest text-xs uppercase mb-2">Settings</p>
        <h1 className="text-4xl font-bold mb-12">Account Settings</h1>

        <div className="space-y-4">
          {/* Account */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0F0E1C] border border-white/8 rounded-2xl p-8">
            <h2 className="text-white font-heading font-semibold text-lg mb-6">Account</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-white/35 text-[10px] uppercase tracking-widest block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-[#0B0A16] border border-white/8 rounded-xl px-4 py-3 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-[#DEB04A]/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-white/35 text-[10px] uppercase tracking-widest block mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full bg-[#0B0A16] border border-white/8 rounded-xl px-4 py-3 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-[#DEB04A]/40 transition-colors"
                />
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#DEB04A] text-black font-heading font-semibold rounded-xl hover:bg-[#E8C060] transition-colors text-sm shadow-[0_0_16px_rgba(222,176,74,0.2)] disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                {saveMsg && (
                  <p className={`text-sm ${saveMsg === 'Saved!' ? 'text-[#DEB04A]' : 'text-red-400/80'}`}>{saveMsg}</p>
                )}
              </div>
            </form>
          </motion.div>

          {/* Billing */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="bg-[#0F0E1C] border border-white/8 rounded-2xl p-8">
            <h2 className="text-white font-heading font-semibold text-lg mb-6">Billing</h2>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Current Plan</p>
                <p className="text-white font-semibold">Free</p>
              </div>
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Total Masters</p>
                <p className="text-white font-semibold">{mastersCount} processed</p>
              </div>
              <button className="px-5 py-2.5 bg-white/5 border border-white/10 text-white/30 font-heading font-semibold rounded-xl text-sm cursor-default">
                Upgrade — Coming Soon
              </button>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="bg-[#0F0E1C] border border-white/8 rounded-2xl p-8">
            <h2 className="text-white font-heading font-semibold text-lg mb-6">Notifications</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Email on master complete</p>
                <p className="text-white/35 text-xs mt-0.5">Get an email when your track is ready to download.</p>
              </div>
              <button
                onClick={() => setEmailNotifs(!emailNotifs)}
                className={`relative w-12 h-6 rounded-full transition-colors ${emailNotifs ? 'bg-[#DEB04A]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${emailNotifs ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
