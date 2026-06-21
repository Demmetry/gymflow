'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, Clock, Users, Dumbbell, Trash2, X, AlertTriangle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

const COLORS = ['#b5ff47','#60a5fa','#f97316','#a78bfa','#f43f5e','#34d399']
const CATEGORIES = ['HIIT','YOGA','PILATES','CROSSFIT','SPINNING','BOXING','STRENGTH','CARDIO','DANCE','STRETCHING']

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', category: 'HIIT', duration: 45,
    capacity: 20, color: '#b5ff47', startTime: '', endTime: '',
  })

  function load() {
    setLoading(true)
    fetch('/api/classes').then(r => r.json()).then(d => { setClasses(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function addClass(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { toast.success('Class added!'); setShowForm(false); setForm({ name:'',description:'',category:'HIIT',duration:45,capacity:20,color:'#b5ff47',startTime:'',endTime:'' }); load() }
    else { const d = await res.json().catch(()=>({})); toast.error(d.error || 'Failed to add class') }
  }

  async function deleteClass() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/classes?id=${deleteTarget.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) { toast.success(`"${deleteTarget.name}" deleted`); setDeleteTarget(null); load() }
    else toast.error('Failed to delete class')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">CLASSES</h1>
          <p className="text-dark-300 text-sm mt-1">{classes.length} scheduled classes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16}/> Add Class</button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_,i) => <div key={i} className="h-44 skeleton rounded-2xl"/>)}</div>
      ) : classes.length === 0 ? (
        <div className="card text-center py-16"><Calendar size={48} className="mx-auto text-dark-600 mb-4"/><p className="text-dark-400">No classes yet — add your first one</p></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls: any, i: number) => (
            <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card-hover group relative" style={{ borderLeftColor: cls.color || '#b5ff47', borderLeftWidth: 3 }}>
              {/* Delete button */}
              <button
                onClick={() => setDeleteTarget(cls)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-dark-600 transition-all"
              >
                <Trash2 size={14}/>
              </button>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${cls.color}20` }}>
                  <Dumbbell size={16} style={{ color: cls.color }} />
                </div>
                <span className="text-xs text-dark-400 bg-dark-700 px-2 py-1 rounded-full">{cls.category || 'General'}</span>
              </div>
              <h3 className="font-semibold text-white mb-1">{cls.name}</h3>
              <p className="text-dark-400 text-xs mb-3 line-clamp-2">{cls.description || 'No description'}</p>
              {cls.trainer && <p className="text-xs text-lime-400/70 mb-2">Trainer: {cls.trainer.firstName} {cls.trainer.lastName}</p>}
              <div className="flex items-center gap-4 text-xs text-dark-300">
                <span className="flex items-center gap-1"><Clock size={12}/> {cls.duration}min</span>
                <span className="flex items-center gap-1"><Users size={12}/> {cls.capacity} max</span>
              </div>
              <div className="mt-3 text-xs text-dark-500">{formatDateTime(cls.startTime)}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Class Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-800 border border-dark-600 rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl tracking-wider text-white">ADD CLASS</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"><X size={18}/></button>
              </div>
              <form onSubmit={addClass} className="space-y-4">
                <div><label className="label">Class Name</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required className="input" placeholder="e.g. Morning HIIT Blast"/></div>
                <div><label className="label">Description</label><textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} className="input h-20 resize-none" placeholder="What members can expect..."/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Category</label>
                    <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} className="input">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Duration (min)</label><input type="number" value={form.duration} onChange={e => setForm(f=>({...f,duration:+e.target.value}))} min={15} max={180} className="input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm(f=>({...f,capacity:+e.target.value}))} min={1} className="input"/></div>
                  <div><label className="label">Color</label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setForm(f=>({...f,color:c}))}
                          className="w-7 h-7 rounded-full border-2 transition-all"
                          style={{ background: c, borderColor: form.color === c ? 'white' : 'transparent' }}/>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Start Time</label><input type="datetime-local" value={form.startTime} onChange={e => setForm(f=>({...f,startTime:e.target.value}))} required className="input"/></div>
                  <div><label className="label">End Time</label><input type="datetime-local" value={form.endTime} onChange={e => setForm(f=>({...f,endTime:e.target.value}))} required className="input"/></div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">Add Class</button>
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
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-400"/>
              </div>
              <h3 className="font-display text-2xl text-white mb-2">DELETE CLASS</h3>
              <p className="text-white font-semibold mb-1">"{deleteTarget.name}"</p>
              <p className="text-dark-400 text-sm mb-6">This will remove the class and all bookings. Cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button onClick={deleteClass} disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 text-sm">
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
