'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, Clock, Users, Dumbbell, Trash2, X, AlertTriangle, ChevronLeft, ChevronRight, Repeat, Search, UserCheck, LayoutGrid, CalendarDays } from 'lucide-react'
import { formatDateTime, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

const COLORS = ['#b5ff47','#60a5fa','#f97316','#a78bfa','#f43f5e','#34d399']
const CATEGORIES = ['HIIT','YOGA','PILATES','CROSSFIT','SPINNING','BOXING','STRENGTH','CARDIO','DANCE','STRETCHING']
const DAY_ABBR = ['SUN','MON','TUE','WED','THU','FRI','SAT']
const DAY_LABEL = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function startOfWeek(offset: number): Date {
  const d = new Date()
  const day = d.getDay() // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'week' | 'all'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedClass, setSelectedClass] = useState<any>(null)

  const [form, setForm] = useState({
    name: '', description: '', category: 'HIIT', duration: 45,
    capacity: 20, color: '#b5ff47', startTime: '', endTime: '', isRecurring: false,
  })

  function load() {
    setLoading(true)
    fetch('/api/classes').then(r => r.json()).then(d => { setClasses(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function addClass(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      toast.success(form.isRecurring ? 'Recurring class added — it will repeat every week!' : 'Class added!')
      setShowForm(false)
      setForm({ name:'',description:'',category:'HIIT',duration:45,capacity:20,color:'#b5ff47',startTime:'',endTime:'',isRecurring:false })
      load()
    } else { const d = await res.json().catch(()=>({})); toast.error(d.error || 'Failed to add class') }
  }

  async function deleteClass() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/classes?id=${deleteTarget.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) { toast.success(`"${deleteTarget.name}" deleted`); setDeleteTarget(null); setSelectedClass(null); load() }
    else toast.error('Failed to delete class')
  }

  const weekDays = useMemo(() => {
    const monday = startOfWeek(weekOffset)
    return [...Array(7)].map((_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekOffset])

  function classesForDay(day: Date) {
    const abbr = DAY_ABBR[day.getDay()]
    return classes
      .filter(c => {
        if (c.isRecurring) return c.recurrenceRule === `WEEKLY:${abbr}`
        return new Date(c.startTime).toDateString() === day.toDateString()
      })
      .sort((a, b) => new Date(a.startTime).getHours() * 60 + new Date(a.startTime).getMinutes() - (new Date(b.startTime).getHours() * 60 + new Date(b.startTime).getMinutes()))
  }

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">CLASSES</h1>
          <p className="text-dark-300 text-sm mt-1">{classes.length} active classes · {classes.filter(c=>c.isRecurring).length} recurring weekly</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-dark-800 border border-dark-600 rounded-xl p-1">
            <button onClick={() => setView('week')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view==='week' ? 'bg-lime-400 text-dark-950 font-bold' : 'text-dark-400'}`}>
              <CalendarDays size={13}/> Week
            </button>
            <button onClick={() => setView('all')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view==='all' ? 'bg-lime-400 text-dark-950 font-bold' : 'text-dark-400'}`}>
              <LayoutGrid size={13}/> All
            </button>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16}/> Add Class</button>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_,i) => <div key={i} className="h-44 skeleton rounded-2xl"/>)}</div>
      ) : classes.length === 0 ? (
        <div className="card text-center py-16"><Calendar size={48} className="mx-auto text-dark-600 mb-4"/><p className="text-dark-400 mb-1">No classes yet</p><p className="text-dark-500 text-xs">Add one — mark it recurring and it'll show up every week automatically</p></div>
      ) : view === 'week' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekOffset(w => w - 1)} className="btn-ghost text-xs py-1.5 px-3"><ChevronLeft size={14}/> Prev</button>
            <p className="text-dark-300 text-sm font-medium">{weekDays[0].toLocaleDateString(undefined,{month:'short',day:'numeric'})} – {weekDays[6].toLocaleDateString(undefined,{month:'short',day:'numeric'})}{weekOffset !== 0 && <button onClick={()=>setWeekOffset(0)} className="ml-2 text-lime-400 text-xs hover:underline">Today</button>}</p>
            <button onClick={() => setWeekOffset(w => w + 1)} className="btn-ghost text-xs py-1.5 px-3">Next <ChevronRight size={14}/></button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => {
              const dayClasses = classesForDay(day)
              return (
                <div key={i} className={`rounded-xl border p-2 min-h-[200px] ${isToday(day) ? 'bg-lime-400/5 border-lime-400/30' : 'bg-dark-800 border-dark-700'}`}>
                  <p className={`text-xs font-semibold mb-2 text-center ${isToday(day) ? 'text-lime-400' : 'text-dark-400'}`}>{DAY_LABEL[i]} <span className="text-dark-500 font-normal">{day.getDate()}</span></p>
                  <div className="space-y-1.5">
                    {dayClasses.length === 0 ? (
                      <p className="text-dark-600 text-[10px] text-center py-4">—</p>
                    ) : dayClasses.map(c => {
                      const booked = c._count?.bookings ?? 0
                      const full = booked >= c.capacity
                      return (
                        <button key={c.id} onClick={() => setSelectedClass(c)}
                          className="w-full text-left p-2 rounded-lg border transition-all hover:scale-[1.02]"
                          style={{ background: `${c.color}12`, borderColor: `${c.color}40` }}>
                          <div className="flex items-center gap-1">
                            {c.isRecurring && <Repeat size={9} style={{ color: c.color }} className="flex-shrink-0"/>}
                            <p className="text-white text-[11px] font-semibold truncate">{c.name}</p>
                          </div>
                          <p className="text-dark-400 text-[10px]">{new Date(c.startTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>
                          <p className={`text-[10px] font-mono mt-0.5 ${full ? 'text-orange-400' : 'text-dark-500'}`}>{booked}/{c.capacity}{full ? ' FULL' : ''}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls: any, i: number) => {
            const booked = cls._count?.bookings ?? 0
            const pct = Math.min(100, Math.round((booked / cls.capacity) * 100))
            return (
              <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedClass(cls)}
                className="card-hover group relative cursor-pointer" style={{ borderLeftColor: cls.color || '#b5ff47', borderLeftWidth: 3 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(cls) }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-dark-600 transition-all z-10"
                >
                  <Trash2 size={14}/>
                </button>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${cls.color}20` }}>
                    <Dumbbell size={16} style={{ color: cls.color }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {cls.isRecurring && <span className="flex items-center gap-1 text-[10px] text-dark-400 bg-dark-700 px-2 py-1 rounded-full"><Repeat size={9}/> Weekly</span>}
                    <span className="text-xs text-dark-400 bg-dark-700 px-2 py-1 rounded-full">{cls.category || 'General'}</span>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1">{cls.name}</h3>
                <p className="text-dark-400 text-xs mb-3 line-clamp-2">{cls.description || 'No description'}</p>
                {cls.trainer && <p className="text-xs text-lime-400/70 mb-2">Trainer: {cls.trainer.firstName} {cls.trainer.lastName}</p>}
                <div className="flex items-center gap-4 text-xs text-dark-300 mb-2">
                  <span className="flex items-center gap-1"><Clock size={12}/> {cls.duration}min</span>
                  <span className="flex items-center gap-1"><Users size={12}/> {booked}/{cls.capacity}</span>
                </div>
                <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? '#f97316' : cls.color }} />
                </div>
                <div className="text-xs text-dark-500">{cls.isRecurring ? `Every ${DAY_LABEL[DAY_ABBR.indexOf(cls.recurrenceRule?.split(':')[1])]}` : formatDateTime(cls.startTime)}</div>
              </motion.div>
            )
          })}
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
                  <div><label className="label">{form.isRecurring ? 'First Occurrence — Start' : 'Start Time'}</label><input type="datetime-local" value={form.startTime} onChange={e => setForm(f=>({...f,startTime:e.target.value}))} required className="input"/></div>
                  <div><label className="label">End Time</label><input type="datetime-local" value={form.endTime} onChange={e => setForm(f=>({...f,endTime:e.target.value}))} required className="input"/></div>
                </div>

                <label className="flex items-center gap-3 bg-dark-700 border border-dark-600 rounded-xl p-3 cursor-pointer">
                  <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f=>({...f,isRecurring:e.target.checked}))} className="w-4 h-4 accent-lime-400"/>
                  <div>
                    <p className="text-white text-sm font-medium flex items-center gap-1.5"><Repeat size={13} className="text-lime-400"/> Repeats every week</p>
                    <p className="text-dark-400 text-xs">{form.startTime ? `Automatically shows up every ${DAY_LABEL[new Date(form.startTime).getDay()]} at this time — no need to recreate it weekly` : 'Pick a start time first'}</p>
                  </div>
                </label>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">Add Class</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Roster Panel */}
      <AnimatePresence>
        {selectedClass && (
          <ClassRosterPanel cls={selectedClass} onClose={() => setSelectedClass(null)} onDelete={() => { setDeleteTarget(selectedClass) }} onChanged={load} />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-800 border border-red-500/30 rounded-2xl p-8 w-full max-w-sm text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-400"/>
              </div>
              <h3 className="font-display text-2xl text-white mb-2">DELETE CLASS</h3>
              <p className="text-white font-semibold mb-1">&quot;{deleteTarget.name}&quot;</p>
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

function ClassRosterPanel({ cls, onClose, onDelete, onChanged }: { cls: any; onClose: () => void; onDelete: () => void; onChanged: () => void }) {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])

  function loadRoster() {
    setLoading(true)
    fetch(`/api/classes/bookings?classId=${cls.id}`).then(r => r.json()).then(d => { setBookings(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { loadRoster() }, [cls.id]) // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => {
      if (!search) { setResults([]); return }
      const p = new URLSearchParams({ view: 'members', search, limit: '8' })
      fetch(`/api/attendance?${p}`).then(r => r.json()).then(d => setResults(Array.isArray(d?.members) ? d.members : [])).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  async function bookMember(memberId: number) {
    const res = await fetch('/api/classes/bookings', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ classId: cls.id, memberId }) })
    const data = await res.json()
    if (res.ok) {
      toast.success(data.waitlisted ? 'Class full — added to waitlist' : 'Booked!')
      setSearch(''); setResults([]); loadRoster(); onChanged()
    } else toast.error(data.error || 'Failed to book')
  }

  async function markAttended(bookingId: string) {
    const res = await fetch(`/api/classes/bookings?id=${bookingId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'ATTENDED' }) })
    if (res.ok) { toast.success('Marked attended'); loadRoster() } else toast.error('Failed')
  }

  async function removeBooking(bookingId: string) {
    const res = await fetch(`/api/classes/bookings?id=${bookingId}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Removed'); loadRoster(); onChanged() } else toast.error('Failed')
  }

  const bookedIds = new Set(bookings.filter(b => b.status !== 'CANCELED').map(b => b.member.id))

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28 }}
        className="relative w-full max-w-md bg-dark-800 border-l border-dark-600 h-full overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            {cls.isRecurring && <Repeat size={14} style={{ color: cls.color }} />}
            <h2 className="font-display text-2xl text-white">{cls.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-dark-700 text-dark-400"><X size={18}/></button>
        </div>
        <p className="text-dark-400 text-sm mb-6">{cls.category} · {cls.duration}min · {cls.isRecurring ? `Every ${DAY_LABEL[DAY_ABBR.indexOf(cls.recurrenceRule?.split(':')[1])]}` : formatDateTime(cls.startTime)}</p>

        <div className="flex items-center justify-between mb-3">
          <p className="text-dark-500 text-xs uppercase tracking-widest font-mono">Roster</p>
          <span className="text-xs font-mono text-dark-400">{bookings.filter(b=>b.status!=='WAITLIST').length}/{cls.capacity}</span>
        </div>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search a member to book..." className="input pl-9 text-sm"/>
        </div>
        {results.length > 0 && (
          <div className="space-y-1 mb-4 bg-dark-900 border border-dark-700 rounded-xl p-2 max-h-40 overflow-y-auto">
            {results.map(m => (
              <button key={m.id} disabled={bookedIds.has(m.id)} onClick={() => bookMember(m.id)}
                className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-dark-700 text-sm disabled:opacity-40 disabled:cursor-default">
                <span className="text-white">{m.firstName} {m.lastName}</span>
                {bookedIds.has(m.id) ? <span className="text-dark-500 text-xs">Booked</span> : <Plus size={14} className="text-lime-400"/>}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="h-12 skeleton rounded-xl"/>)}</div>
        ) : bookings.length === 0 ? (
          <p className="text-dark-500 text-sm text-center py-8">No one booked yet</p>
        ) : (
          <div className="space-y-2">
            {bookings.map(b => (
              <div key={b.id} className="flex items-center gap-3 bg-dark-700 border border-dark-600 rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-dark-600 border border-dark-500 flex items-center justify-center text-xs font-bold text-lime-400 flex-shrink-0">
                  {getInitials(`${b.member.firstName} ${b.member.lastName}`)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{b.member.firstName} {b.member.lastName}</p>
                  {b.status === 'WAITLIST' && <p className="text-orange-400 text-xs">Waitlisted</p>}
                  {b.status === 'ATTENDED' && <p className="text-lime-400 text-xs">Attended</p>}
                </div>
                {b.status !== 'ATTENDED' && (
                  <button onClick={() => markAttended(b.id)} title="Mark attended" className="p-1.5 rounded-lg hover:bg-lime-400/10 text-dark-500 hover:text-lime-400 transition-colors">
                    <UserCheck size={14}/>
                  </button>
                )}
                <button onClick={() => removeBooking(b.id)} title="Remove" className="p-1.5 rounded-lg hover:bg-red-500/10 text-dark-500 hover:text-red-400 transition-colors">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>
        )}

        <button onClick={onDelete} className="w-full mt-8 text-red-400 text-xs hover:underline">Delete this class</button>
      </motion.div>
    </div>
  )
}
