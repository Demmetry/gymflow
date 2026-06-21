'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, Plus, AlertTriangle, CheckCircle2, Clock, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Equipment {
  id: string; name: string; category: string; brand?: string; serialNumber?: string
  status: string; lastMaintenance?: string; nextMaintenance?: string; notes?: string
}

const CATEGORIES = ['CARDIO','STRENGTH','FREE_WEIGHTS','FUNCTIONAL','STRETCHING','OTHER']
const STATUS_OPTIONS = ['OPERATIONAL','MAINTENANCE','OUT_OF_SERVICE']

const statusStyle: Record<string, string> = {
  OPERATIONAL: 'text-lime-400 bg-lime-400/10 border-lime-400/20',
  MAINTENANCE: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  OUT_OF_SERVICE: 'text-red-400 bg-red-400/10 border-red-400/20',
}

function daysUntil(dateStr?: string) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null)
  const [form, setForm] = useState({ name:'', category:'CARDIO', brand:'', serialNumber:'', status:'OPERATIONAL', lastMaintenance:'', nextMaintenance:'', notes:'' })

  function load() {
    setLoading(true)
    fetch('/api/equipment').then(r => r.json()).then(d => { setEquipment(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function addEquipment(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/equipment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) })
    if (res.ok) { toast.success('Equipment added!'); setShowForm(false); load() }
    else { const d = await res.json().catch(()=>({})); toast.error(d.error || 'Failed to add equipment') }
  }

  async function markMaintained(item: Equipment) {
    const today = new Date().toISOString().split('T')[0]
    const next = new Date()
    next.setMonth(next.getMonth() + 3)
    const res = await fetch(`/api/equipment?id=${item.id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'OPERATIONAL', lastMaintenance: today, nextMaintenance: next.toISOString().split('T')[0] }),
    })
    if (res.ok) { toast.success('Marked as maintained'); load() }
    else toast.error('Failed')
  }

  async function deleteEquipment() {
    if (!deleteTarget) return
    const res = await fetch(`/api/equipment?id=${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success(`${deleteTarget.name} removed`); setDeleteTarget(null); load() }
    else toast.error('Failed')
  }

  const overdue = equipment.filter(e => { const d = daysUntil(e.nextMaintenance); return d !== null && d <= 0 })
  const dueSoon = equipment.filter(e => { const d = daysUntil(e.nextMaintenance); return d !== null && d > 0 && d <= 14 })
  const outOfService = equipment.filter(e => e.status === 'OUT_OF_SERVICE')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">EQUIPMENT</h1>
          <p className="text-dark-300 text-sm mt-1">Track maintenance schedules and equipment status</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16}/> Add Equipment</button>
      </div>

      {/* Alert banners */}
      <div className="space-y-3">
        {overdue.length > 0 && (
          <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0"/>
            <p className="text-red-300 text-sm"><span className="font-bold">{overdue.length} item{overdue.length>1?'s':''}</span> overdue for maintenance: {overdue.map(e=>e.name).join(', ')}</p>
          </div>
        )}
        {dueSoon.length > 0 && (
          <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-4 flex items-center gap-3">
            <Clock size={18} className="text-yellow-400 flex-shrink-0"/>
            <p className="text-yellow-300 text-sm"><span className="font-bold">{dueSoon.length} item{dueSoon.length>1?'s':''}</span> due for maintenance within 14 days</p>
          </div>
        )}
        {outOfService.length > 0 && (
          <div className="border border-orange-500/30 bg-orange-500/5 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-orange-400 flex-shrink-0"/>
            <p className="text-orange-300 text-sm"><span className="font-bold">{outOfService.length} item{outOfService.length>1?'s':''}</span> currently out of service</p>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Equipment', value: equipment.length, color: 'text-white' },
          { label: 'Operational', value: equipment.filter(e=>e.status==='OPERATIONAL').length, color: 'text-lime-400' },
          { label: 'In Maintenance', value: equipment.filter(e=>e.status==='MAINTENANCE').length, color: 'text-yellow-400' },
          { label: 'Out of Service', value: outOfService.length, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className={`font-display text-4xl mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-xs text-dark-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Equipment list */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-20 skeleton rounded-2xl"/>)}</div>
      ) : equipment.length === 0 ? (
        <div className="card text-center py-16"><Wrench size={48} className="mx-auto text-dark-600 mb-4"/><p className="text-dark-400">No equipment added yet</p></div>
      ) : (
        <div className="space-y-3">
          {equipment.map((item, i) => {
            const days = daysUntil(item.nextMaintenance)
            const isOverdue = days !== null && days <= 0
            const isSoon = days !== null && days > 0 && days <= 14
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-dark-800 border border-dark-600 hover:border-dark-500 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 group transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white font-semibold">{item.name}</span>
                    <span className={`badge text-xs ${statusStyle[item.status]}`}>{item.status.replace('_',' ')}</span>
                    {isOverdue && <span className="badge text-xs text-red-400 bg-red-400/10 border-red-400/20">OVERDUE</span>}
                    {isSoon && <span className="badge text-xs text-yellow-400 bg-yellow-400/10 border-yellow-400/20">DUE SOON</span>}
                  </div>
                  <div className="text-dark-400 text-xs flex flex-wrap gap-3">
                    <span>{item.category}</span>
                    {item.brand && <span>· {item.brand}</span>}
                    {item.serialNumber && <span>· #{item.serialNumber}</span>}
                    {item.lastMaintenance && <span>· Last service: {item.lastMaintenance}</span>}
                    {item.nextMaintenance && (
                      <span className={isOverdue ? 'text-red-400' : isSoon ? 'text-yellow-400' : ''}>
                        · Next service: {item.nextMaintenance} {days !== null && `(${days > 0 ? `in ${days}d` : `${Math.abs(days)}d overdue`})`}
                      </span>
                    )}
                  </div>
                  {item.notes && <p className="text-dark-500 text-xs mt-1 italic">{item.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.status !== 'OPERATIONAL' && (
                    <button onClick={() => markMaintained(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs rounded-lg hover:bg-lime-400/20 transition-colors">
                      <CheckCircle2 size={12}/> Mark Maintained
                    </button>
                  )}
                  <button onClick={() => setDeleteTarget(item)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-dark-600 transition-all">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-800 border border-dark-600 rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl tracking-wider text-white">ADD EQUIPMENT</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white"><X size={18}/></button>
              </div>
              <form onSubmit={addEquipment} className="space-y-4">
                <div><label className="label">Equipment Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required className="input" placeholder="e.g. Treadmill #3"/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Category</label>
                    <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="input">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Status</label>
                    <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="input">
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Brand (optional)</label><input value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} className="input" placeholder="Life Fitness"/></div>
                  <div><label className="label">Serial No. (optional)</label><input value={form.serialNumber} onChange={e=>setForm(f=>({...f,serialNumber:e.target.value}))} className="input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Last Maintenance</label><input type="date" value={form.lastMaintenance} onChange={e=>setForm(f=>({...f,lastMaintenance:e.target.value}))} className="input"/></div>
                  <div><label className="label">Next Maintenance</label><input type="date" value={form.nextMaintenance} onChange={e=>setForm(f=>({...f,nextMaintenance:e.target.value}))} className="input"/></div>
                </div>
                <div><label className="label">Notes (optional)</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="input h-16 resize-none" placeholder="Any issues or observations..."/></div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">Add Equipment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-800 border border-red-500/30 rounded-2xl p-8 w-full max-w-sm text-center">
              <h3 className="font-display text-2xl text-white mb-2">DELETE EQUIPMENT</h3>
              <p className="text-white font-semibold mb-4">"{deleteTarget.name}"</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button onClick={deleteEquipment} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-sm">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
