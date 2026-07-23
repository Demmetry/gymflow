'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const normalizedEmail = email.toLowerCase().trim()
    const status: any = await fetch('/api/auth/login-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    }).then(r => r.ok ? r.json() : {})

    if (status?.blocked) {
      setLoading(false)
      const minutes = Math.ceil((status.retryAfterSeconds || 60) / 60)
      toast.error(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`)
      return
    }

    const result = await signIn('credentials', { email: normalizedEmail, password, redirect: false })
    setLoading(false)
    if (result?.error) toast.error('Invalid email or password')
    else { toast.success('Welcome back!'); router.push('/dashboard') }
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
          <h1 className="font-display text-4xl tracking-wider mb-2">WELCOME BACK</h1>
          <p className="text-dark-300 text-sm">Sign in to your gym dashboard</p>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@yourgym.com" required className="input pl-10" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-dark-400 hover:text-lime-400 transition-colors">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 disabled:opacity-50">
              {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={16}/></>}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-dark-600">
            {process.env.NEXT_PUBLIC_SHOW_DEMO_CREDS === 'true' && (
              <p className="text-center text-xs text-dark-400">Demo: <span className="text-lime-400 font-mono">demo@gymflow.app</span> / <span className="text-lime-400 font-mono">demo123456</span></p>
            )}
          </div>
        </div>
        <p className="text-center text-sm text-dark-400 mt-6">Don&apos;t have an account? <Link href="/auth/register" className="text-lime-400 hover:underline">Start free trial</Link></p>
      </motion.div>
    </div>
  )
}
