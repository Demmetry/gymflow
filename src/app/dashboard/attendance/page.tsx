'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCheck, Search, Users, TrendingUp, AlertCircle, Clock, CheckCircle2, Zap, QrCode } from 'lucide-react'
import Link from 'next/link'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Member { id: string; memberNumber: number; firstName: string; lastName: string; email: string; membershipStatus: string }
interface CheckIn { id: string; checkedIn: string; method: string; member: Member }
interface Stats { checkIns: CheckIn[]; todayCount: number; weeklyCheckIns: number; inactiveCount: number; total: number; page: number; totalPages: number }

export default function AttendancePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [logPage, setLogPage] = useState(1)

  function loadStats() {
    const p = new URLSearchParams()
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    p.set('page', String(logPage))
    p.set('limit', '50')
    fetch(`/api/attendance?${p}`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadStats() }, [dateFrom, dateTo, logPage]) // eslint-disable-line
  useEffect(() => { setLogPage(1) }, [dateFrom, dateTo])

  // Debounced, server-side member search — doesn't load the whole roster up front
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams({ view: 'members', limit: '20' })
      if (search) p.set('search', search)
      fetch(`/api/attendance?${p}`)
        .then(r => r.json())
        .then(d => { setMembers(Array.isArray(d?.members) ? d.members : []); setMemberTotal(d?.total || 0) })
        .catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const checkedInIds = new Set(stats?.checkIns.map(c => c.member.id) || [])

  async function checkIn(member: Member) {
    if (checkedInIds.has(member.id)) { toast('Already checked in today', { icon: '✓' }); return }
    setCheckingIn(member.id)
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, method: 'MANUAL' }),
    })
    setCheckingIn(null)
    if (res.ok) { toast.success(`${member.firstName} checked in!`); loadStats() }
    else { const d = await res.json(); toast.error(d.error || 'Failed') }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">ATTENDANCE</h1>
          <p className="text-dark-300 text-sm mt-1">Manual check-in — click a member to log their visit</p>
        </div>
        <Link href="/dashboard/attendance/scan"
          className="flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-dark-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95">
          <QrCode size={16} />
          Open QR Scanner
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: UserCheck, label: 'Today', value: loading ? '—' : String(stats?.todayCount ?? 0), color: 'lime' },
          { icon: TrendingUp, label: 'This Week', value: loading ? '—' : String(stats?.weeklyCheckIns ?? 0), color: 'blue' },
          { icon: Users, label: 'Active Members', value: loading ? '—' : String(memberTotal), color: 'purple' },
          { icon: AlertCircle, label: 'Inactive 30d', value: loading ? '—' : String(stats?.inactiveCount ?? 0), color: 'orange' },
        ].map(s => {
          const Icon = s.icon
          const colorMap: Record<string, string> = {
            lime: 'text-lime-400 bg-lime-400/10 border-lime-400/20',
            blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
            purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
            orange: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
          }
          return (
            <div key={s.label} className="card">
              <div className={`inline-flex p-2 rounded-lg border mb-3 ${colorMap[s.color]}`}><Icon size={16}/></div>
              <div className="font-display text-3xl text-white mb-0.5">{s.value}</div>
              <div className="text-xs text-dark-400">{s.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Check-in panel */}
        <div className="card space-y-4">
          <h2 className="font-display text-xl tracking-wider text-white">CHECK IN A MEMBER</h2>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, or member #..." className="input pl-9"/>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {members.length === 0 ? (
              <div className="text-center py-8 text-dark-500 text-sm">No members found</div>
            ) : members.map(m => {
              const alreadyIn = checkedInIds.has(m.id)
              const isLoading = checkingIn === m.id
              return (
                <motion.button
                  key={m.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => checkIn(m)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    alreadyIn
                      ? 'bg-lime-400/5 border-lime-400/20 cursor-default'
                      : 'bg-dark-700 border-dark-600 hover:border-lime-400/40 hover:bg-dark-600'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-dark-600 border border-dark-500 flex items-center justify-center text-xs font-bold text-lime-400 flex-shrink-0">
                    {getInitials(`${m.firstName} ${m.lastName}`)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate flex items-center gap-1.5">
                      {m.firstName} {m.lastName}
                      <span className="text-dark-500 text-[10px] font-mono">#{m.memberNumber}</span>
                    </div>
                    <div className="text-dark-400 text-xs truncate">{m.email}</div>
                  </div>
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin flex-shrink-0"/>
                  ) : alreadyIn ? (
                    <CheckCircle2 size={18} className="text-lime-400 flex-shrink-0"/>
                  ) : (
                    <Zap size={16} className="text-dark-500 flex-shrink-0"/>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Check-in log */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-xl tracking-wider text-white">CHECK-IN LOG</h2>
            <div className="flex items-center gap-2 text-xs">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input py-1.5 text-xs w-auto"/>
              <span className="text-dark-500">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input py-1.5 text-xs w-auto"/>
              {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-dark-500 hover:text-white">Clear</button>}
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {loading ? (
              [...Array(4)].map((_,i) => <div key={i} className="h-14 skeleton rounded-xl"/>)
            ) : !stats?.checkIns.length ? (
              <div className="text-center py-8 text-dark-500 text-sm">{dateFrom || dateTo ? 'No check-ins in this range' : 'No check-ins yet today'}</div>
            ) : stats.checkIns.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl border border-dark-600">
                <div className="w-8 h-8 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-xs font-bold text-lime-400 flex-shrink-0">
                  {getInitials(`${c.member.firstName} ${c.member.lastName}`)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{c.member.firstName} {c.member.lastName}</div>
                  <div className="flex items-center gap-1 text-dark-400 text-xs">
                    <Clock size={10}/>
                    {new Date(c.checkedIn).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    <span className="ml-1 text-dark-600">·</span>
                    <span className="text-dark-500">{c.method}</span>
                  </div>
                </div>
                <CheckCircle2 size={16} className="text-lime-400 flex-shrink-0"/>
              </motion.div>
            ))}
          </div>
          {stats && stats.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-dark-700">
              <p className="text-dark-500 text-xs">Page {stats.page} of {stats.totalPages} · {stats.total} total</p>
              <div className="flex gap-2">
                <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage <= 1} className="btn-ghost text-xs py-1 px-2.5 disabled:opacity-40">Prev</button>
                <button onClick={() => setLogPage(p => Math.min(stats.totalPages, p + 1))} disabled={logPage >= stats.totalPages} className="btn-ghost text-xs py-1 px-2.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inactive warning */}
      {stats && stats.inactiveCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="border border-orange-500/20 bg-orange-500/5 rounded-2xl p-5 flex items-start gap-4">
          <AlertCircle size={20} className="text-orange-400 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-white font-semibold text-sm">{stats.inactiveCount} active member{stats.inactiveCount > 1 ? 's have' : ' has'} not visited in 30+ days</p>
            <p className="text-dark-400 text-xs mt-1">Consider sending a win-back message to re-engage them before their membership lapses.</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
