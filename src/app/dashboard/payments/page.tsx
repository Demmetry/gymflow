'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, DollarSign, TrendingUp, AlertCircle, Plus, Trash2, Search } from 'lucide-react'
import { formatCurrency, formatDate, paymentColors, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const TYPES = ['MEMBERSHIP', 'CLASS', 'PERSONAL_TRAINING', 'PRODUCT']
const STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']
const METHODS = ['CASH', 'CARD', 'BANK_TRANSFER']

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ totalRevenue: 0, thisMonth: 0, pendingCount: 0, pendingAmount: 0 })

  const [form, setForm] = useState({
    memberId: '', amount: '', type: 'MEMBERSHIP', status: 'COMPLETED', method: 'CASH', description: '',
  })

  function load() {
    setLoading(true)
    const p = new URLSearchParams()
    if (statusFilter !== 'ALL') p.set('status', statusFilter)
    if (search) p.set('search', search)
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    p.set('page', String(page))
    p.set('limit', '25')
    fetch(`/api/payments?${p}`)
      .then(r => r.json())
      .then(d => {
        setPayments(Array.isArray(d?.payments) ? d.payments : [])
        setTotalPages(d?.totalPages || 1)
        setTotal(d?.total || 0)
        if (d?.stats) setStats(d.stats)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter, search, dateFrom, dateTo, page]) // eslint-disable-line
  useEffect(() => { setPage(1) }, [statusFilter, search, dateFrom, dateTo])

  useEffect(() => {
    fetch('/api/members').then(r => r.ok ? r.json() : null).then(d => setMembers(Array.isArray(d?.members) ? d.members : [])).catch(() => {})
  }, [])

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, memberId: form.memberId || null }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Payment recorded!')
      setShowForm(false)
      setForm({ memberId: '', amount: '', type: 'MEMBERSHIP', status: 'COMPLETED', method: 'CASH', description: '' })
      load()
    } else {
      const d = await res.json()
      toast.error(d.error || 'Failed to record payment')
    }
  }

  async function deletePayment(id: string) {
    if (!window.confirm('Delete this payment record? This cannot be undone.')) return
    const res = await fetch(`/api/payments?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Payment deleted'); load() }
    else { const d = await res.json(); toast.error(d.error || 'Failed to delete') }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-4xl tracking-wider text-white">PAYMENTS</h1><p className="text-dark-300 text-sm mt-1">Revenue and billing management</p></div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary">
          <Plus size={16}/> Record Payment
        </button>
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={recordPayment} className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Member (optional)</label>
              <select value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))} className="input">
                <option value="">— No member —</option>
                {members.map((m: any) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" min="0.01" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input" placeholder="49.00"/>
            </div>
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input">
                {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Method</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className="input">
                {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" placeholder="e.g. Cash payment at front desk"/>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-50">{saving ? 'Saving…' : 'Record Payment'}</button>
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="card"><DollarSign size={20} className="text-lime-400 mb-2"/><div className="font-display text-3xl text-white">{formatCurrency(stats.totalRevenue)}</div><div className="text-dark-400 text-xs mt-1">Total Revenue</div></div>
        <div className="card"><TrendingUp size={20} className="text-blue-400 mb-2"/><div className="font-display text-3xl text-white">{formatCurrency(stats.thisMonth)}</div><div className="text-dark-400 text-xs mt-1">This Month</div></div>
        <div className="card"><AlertCircle size={20} className="text-yellow-400 mb-2"/><div className="font-display text-3xl text-white">{stats.pendingCount}</div><div className="text-dark-400 text-xs mt-1">Pending ({formatCurrency(stats.pendingAmount)})</div></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by member..." className="input pl-9 py-2 text-sm"/>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input py-2 text-sm w-auto">
          <option value="ALL">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-dark-400 text-xs">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input py-2 text-sm w-auto"/>
          <label className="text-dark-400 text-xs">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input py-2 text-sm w-auto"/>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-dark-500 hover:text-white text-xs">Clear</button>
          )}
        </div>
      </div>

      <div className="bg-dark-800 border border-dark-600 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-dark-700"><tr>
            {['Member','Type','Amount','Status','Date',''].map(h => <th key={h} className="text-left text-xs text-dark-400 font-medium px-5 py-3">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-dark-700">
            {loading ? [...Array(5)].map((_,i) => <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-5 skeleton rounded"/></td></tr>)
            : payments.length === 0 ? <tr><td colSpan={6} className="px-5 py-8 text-center text-dark-500 text-sm">No payments match your filters.</td></tr>
            : payments.map((p: any) => (
              <tr key={p.id} className="hover:bg-dark-750 transition-colors">
                <td className="px-5 py-4 text-white text-sm">{p.member ? `${p.member.firstName} ${p.member.lastName}` : '—'}</td>
                <td className="px-5 py-4 text-dark-300 text-sm">{p.type}</td>
                <td className="px-5 py-4 text-lime-400 font-mono text-sm font-bold">
                  {formatCurrency(p.amount)}
                  {p.discountType && p.originalAmount && p.originalAmount !== p.amount && (
                    <span className="text-dark-500 line-through ml-2 font-normal text-xs">{formatCurrency(p.originalAmount)}</span>
                  )}
                </td>
                <td className="px-5 py-4"><span className={cn('badge', paymentColors[p.status])}>{p.status}</span></td>
                <td className="px-5 py-4 text-dark-400 text-sm">{formatDate(p.createdAt)}</td>
                <td className="px-5 py-4">
                  <button onClick={() => deletePayment(p.id)} className="text-dark-500 hover:text-red-400 transition-colors">
                    <Trash2 size={14}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-dark-500 text-xs">Page {page} of {totalPages} · {total} payments total</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
