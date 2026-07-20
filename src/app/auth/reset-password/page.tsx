'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      toast.error('This reset link is missing its token.')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    const data: any = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }).then(r => r.ok ? r.json() : {})
    setLoading(false)
    if (data?.success) {
      setDone(true)
      toast.success('Password updated!')
      setTimeout(() => router.push('/auth/login'), 1500)
    } else {
      toast.error(data?.error || 'This reset link is invalid or has expired')
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
          <h1 className="font-display text-4xl tracking-wider mb-2">NEW PASSWORD</h1>
          <p className="text-dark-300 text-sm">Choose a new password for your account</p>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8">
          {done ? (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mx-auto">
                <CheckCircle2 size={22} className="text-lime-400" />
              </div>
              <p className="text-white font-semibold">Password updated</p>
              <p className="text-dark-400 text-sm">Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} className="input pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required minLength={8} className="input pl-10" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 disabled:opacity-50">
                {loading ? 'Updating...' : <><span>Update Password</span><ArrowRight size={16}/></>}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-dark-400 mt-6">
          <Link href="/auth/login" className="text-lime-400 hover:underline">Back to sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
