'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function SettingsPage() {
  const [emailNotifs, setEmailNotifs] = useState(true)

  return (
    <main className="pt-24 px-6 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <p className="text-[#C9A84C] tracking-widest text-xs uppercase mb-2">Settings</p>
        <h1 className="text-4xl font-bold mb-12">Account Settings</h1>

        <div className="space-y-6">
          {/* Account */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111] border border-[#222] rounded-2xl p-8">
            <h2 className="text-white font-semibold text-lg mb-6">Account</h2>
            <div className="space-y-4">
              {[{ label: 'Name', placeholder: 'Your name', type: 'text' }, { label: 'Email', placeholder: 'your@email.com', type: 'email' }, { label: 'New Password', placeholder: '••••••••', type: 'password' }].map((f) => (
                <div key={f.label}>
                  <label className="text-[#888] text-xs uppercase tracking-widest block mb-1.5">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-white/80 text-sm placeholder:text-[#444] focus:outline-none focus:border-[#C9A84C]/40" />
                </div>
              ))}
              <button className="mt-2 px-6 py-2.5 bg-[#C9A84C] text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors text-sm">
                Save Changes
              </button>
            </div>
          </motion.div>

          {/* Billing */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-[#111] border border-[#222] rounded-2xl p-8">
            <h2 className="text-white font-semibold text-lg mb-6">Billing</h2>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[#888] text-xs uppercase tracking-widest mb-1">Current Plan</p>
                <p className="text-white font-semibold">Free</p>
              </div>
              <div>
                <p className="text-[#888] text-xs uppercase tracking-widest mb-1">Usage This Month</p>
                <p className="text-white font-semibold">1 / 1 masters used</p>
              </div>
              <div className="flex gap-3">
                <button className="px-5 py-2.5 bg-[#C9A84C] text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors text-sm">
                  Upgrade to Pro
                </button>
              </div>
            </div>
            <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
              <div className="bg-[#C9A84C] h-1.5 rounded-full" style={{ width: '100%' }} />
            </div>
            <p className="text-[#888] text-xs mt-2">You've used your free master this month. Upgrade for unlimited.</p>
          </motion.div>

          {/* Notifications */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="bg-[#111] border border-[#222] rounded-2xl p-8">
            <h2 className="text-white font-semibold text-lg mb-6">Notifications</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Email on master complete</p>
                <p className="text-[#888] text-xs mt-0.5">Get an email when your track is ready to download.</p>
              </div>
              <button onClick={() => setEmailNotifs(!emailNotifs)}
                className={`relative w-12 h-6 rounded-full transition-colors ${emailNotifs ? 'bg-[#C9A84C]' : 'bg-[#333]'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${emailNotifs ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
