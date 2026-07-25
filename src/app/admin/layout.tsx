import { Zap } from 'lucide-react'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-950">
      <header className="sticky top-0 z-30 h-16 bg-dark-900 border-b border-purple-500/20 flex items-center gap-3 px-6">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" fill="currentColor" />
        </div>
        <span className="font-display text-lg tracking-wider text-white">GYMFLOW</span>
        <span className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-full font-mono">PLATFORM ADMIN</span>
        <div className="flex-1" />
        <Link href="/dashboard" className="text-xs text-dark-400 hover:text-white transition-colors">← Back to my gym</Link>
      </header>
      <main>{children}</main>
    </div>
  )
}
