'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Users, DollarSign, TrendingUp, Search } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Gym {
  id: string; name: string; slug: string; plan: string; planStatus: string; createdAt: string
  owner: { email: string; name: string | null }
  _count: { members: number }
  totalRevenue: number
}
interface Totals { gymCount: number; activeCount: number; totalMembers: number; totalRevenue: number }

const PLANS = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE']
const STATUSES = ['ACTIVE', 'PAST_DUE', 'CANCELED']

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:    'text-lime-400 bg-lime-400/10 border-lime-400/20',
  PAST_DUE:  'text-orange-400 bg-orange-400/10 border-orange-400/20',
  CANCELED:  'text-red-400 bg-red-400/10 border-red-400/20',
}

export default function PlatformAdminPage() {
  const [gyms, setGyms] = useState<Gym[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  function load() {
    setLoading(true)
    fetch('/api/admin/gyms').then(r => r.json()).then(d => {
      if (Array.isArray(d?.gyms)) { setGyms(d.gyms); setTotals(d.totals) }
      setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function updateGym(id: string, field: 'plan' | 'planStatus', value: string) {
    const res = await fetch(`/api/admin/gyms?id=${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) {
      toast.success('Updated')
      setGyms(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g))
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error || 'Failed to update')
    }
  }

  const filtered = gyms.filter(g => {
    if (statusFilter !== 'ALL' && g.planStatus !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!g.name.toLowerCase().includes(q) && !g.owner.email.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wider text-white">ALL GYMS</h1>
        <p className="text-dark-300 text-sm mt-1">Every gym running on GymFlow, and their subscription status</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: 'Total Gyms', value: totals?.gymCount ?? '—', color: 'purple' },
          { icon: TrendingUp, label: 'Active Subscriptions', value: totals?.activeCount ?? '—', color: 'lime' },
          { icon: Users, label: 'Members Across Platform', value: totals?.totalMembers ?? '—', color: 'blue' },
          { icon: DollarSign, label: 'Platform-Wide Revenue', value: totals ? formatCurrency(totals.totalRevenue) : '—', color: 'orange' },
        ].map(s => {
          const Icon = s.icon
          const colorMap: Record<string,string> = {
            purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
            lime: 'text-lime-400 bg-lime-400/10 border-lime-400/20',
            blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
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

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gym or owner email..." className="input pl-9 py-2 text-sm"/>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input py-2 text-sm w-auto">
          <option value="ALL">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-dark-700"><tr>
            {['Gym','Owner','Members','Revenue','Plan','Status','Since'].map(h => <th key={h} className="text-left text-xs text-dark-400 font-medium px-5 py-3">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-dark-700">
            {loading ? [...Array(5)].map((_,i) => <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-5 skeleton rounded"/></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={7} className="px-5 py-8 text-center text-dark-500 text-sm">No gyms match your filters.</td></tr>
            : filtered.map((g, i) => (
              <motion.tr key={g.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-dark-750 transition-colors">
                <td className="px-5 py-4">
                  <p className="text-white text-sm font-medium">{g.name}</p>
                  <p className="text-dark-500 text-xs font-mono">{g.slug}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-dark-200 text-sm">{g.owner.name || '—'}</p>
                  <p className="text-dark-500 text-xs">{g.owner.email}</p>
                </td>
                <td className="px-5 py-4 text-white text-sm font-mono">{g._count.members}</td>
                <td className="px-5 py-4 text-lime-400 text-sm font-mono font-bold">{formatCurrency(g.totalRevenue)}</td>
                <td className="px-5 py-4">
                  <select value={g.plan} onChange={e => updateGym(g.id, 'plan', e.target.value)} className="input py-1.5 text-xs w-auto">
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-5 py-4">
                  <select value={g.planStatus} onChange={e => updateGym(g.id, 'planStatus', e.target.value)}
                    className={cn('text-xs font-semibold rounded-lg px-2 py-1.5 border bg-transparent', STATUS_STYLE[g.planStatus])}>
                    {STATUSES.map(s => <option key={s} value={s} className="bg-dark-800 text-white">{s.replace('_',' ')}</option>)}
                  </select>
                </td>
                <td className="px-5 py-4 text-dark-400 text-xs">{new Date(g.createdAt).toLocaleDateString()}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
