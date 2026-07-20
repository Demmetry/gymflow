'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, Mail, ArrowRight, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const data: any = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(r => r.ok ? r.json() : {})
    setLoading(false)
    if (data?.success) {
      setSent(true)
    } else {
      toast.error('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-lime-400/5 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern" />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center"><Zap size={22} className="text-dark-950" fill="currentColor"/></div>
            <span className="font-display text-2xl tracking-wider">GYMFLOW</span>
          </Link>
          <h1 className="font-display text-4xl tracking-wider mb-2">RESET PASSWORD</h1>
          <p className="text-dark-300 text-sm">We&apos;ll email you a link to get back in</p>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mx-auto">
                <Mail size={22} className="text-lime-400" />
              </div>
              <p className="text-white font-semibold">Check your email</p>
              <p className="text-dark-400 text-sm">If an account exists for <span className="text-lime-400">{email}</span>, a reset link is on its way. It expires in 1 hour.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@yourgym.com" required className="input pl-10" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 disabled:opacity-50">
                {loading ? 'Sending...' : <><span>Send Reset Link</span><ArrowRight size={16}/></>}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-dark-400 mt-6">
          <Link href="/auth/login" className="text-lime-400 hover:underline inline-flex items-center gap-1"><ArrowLeft size={14}/> Back to sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
