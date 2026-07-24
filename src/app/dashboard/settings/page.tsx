'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, User, Users, Plus, Trash2, Eye, EyeOff, X, ShieldCheck, Shield, CreditCard, Pencil } from 'lucide-react'
import { cn, getInitials, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface GymSettings { name: string; address: string; phone: string; email: string; currency: string; timezone: string }
interface StaffAccount { id: string; name: string; email: string; role: string; createdAt: string }
interface Plan { id: string; name: string; price: number; durationDays: number; description?: string; isActive: boolean }

const emptyPlanForm = { name: '', price: '', durationDays: '', description: '' }

export default function SettingsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? 'ADMIN'
  const isAdmin = role === 'ADMIN'

  const [tab, setTab] = useState<'gym'|'plans'|'staff'>('gym')
  const [gymData, setGymData] = useState<GymSettings>({ name:'', address:'', phone:'', email:'', currency:'USD', timezone:'UTC' })
  const [staff, setStaff] = useState<StaffAccount[]>([])
  const [saving, setSaving] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [staffForm, setStaffForm] = useState({ name:'', email:'', password:'' })

  const [plans, setPlans] = useState<Plan[]>([])
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [planForm, setPlanForm] = useState(emptyPlanForm)
  const [planSaving, setPlanSaving] = useState(false)

  function loadPlans() {
    fetch('/api/membership-plans').then(r => r.json()).then(d => { if (Array.isArray(d)) setPlans(d) }).catch(() => {})
  }

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d && !d.error) {
        setGymData({ name: d.name||'', address: d.address||'', phone: d.phone||'', email: d.email||'', currency: d.currency||'USD', timezone: d.timezone||'UTC' })
      }
    }).catch(() => {})
    loadPlans()
    if (isAdmin) {
      fetch('/api/staff-accounts').then(r => r.json()).then(d => { if (Array.isArray(d)) setStaff(d) }).catch(() => {})
    }
  }, [isAdmin])

  async function saveGym(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/settings', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(gymData) })
    setSaving(false)
    if (res.ok) { toast.success('Settings saved!') } else { toast.error('Failed to save') }
  }

  function openNewPlan() {
    setEditingPlan(null)
    setPlanForm(emptyPlanForm)
    setShowPlanForm(true)
  }

  function openEditPlan(p: Plan) {
    setEditingPlan(p)
    setPlanForm({ name: p.name, price: String(p.price), durationDays: String(p.durationDays), description: p.description || '' })
    setShowPlanForm(true)
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault()
    setPlanSaving(true)
    const body = { name: planForm.name, price: planForm.price, durationDays: planForm.durationDays, description: planForm.description || null }
    const res = editingPlan
      ? await fetch(`/api/membership-plans?id=${editingPlan.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
      : await fetch('/api/membership-plans', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
    setPlanSaving(false)
    const data = await res.json()
    if (res.ok) {
      toast.success(editingPlan ? 'Plan updated!' : 'Plan created!')
      setShowPlanForm(false)
      loadPlans()
    } else {
      toast.error(data.error || 'Failed to save plan')
    }
  }

  async function togglePlanActive(p: Plan) {
    const res = await fetch(`/api/membership-plans?id=${p.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ isActive: !p.isActive }) })
    if (res.ok) { toast.success(p.isActive ? 'Plan deactivated' : 'Plan reactivated'); loadPlans() }
    else toast.error('Failed to update plan')
  }

  async function deletePlan(p: Plan) {
    if (!window.confirm(`Delete "${p.name}"? If members are on this plan, it will be deactivated instead of deleted.`)) return
    const res = await fetch(`/api/membership-plans?id=${p.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      toast.success(data.deactivated ? 'Plan in use — deactivated instead of deleted' : 'Plan deleted')
      loadPlans()
    } else toast.error(data.error || 'Failed to delete plan')
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/staff-accounts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(staffForm) })
    const data = await res.json()
    if (res.ok) {
      toast.success(`Receptionist account created for ${staffForm.name}`)
      setStaff(prev => [data, ...prev])
      setShowAddStaff(false)
      setStaffForm({ name:'', email:'', password:'' })
    } else toast.error(data.error || 'Failed')
  }

  async function removeStaff(id: string, name: string) {
    if (!window.confirm(`Remove ${name}'s access? They will no longer be able to log in.`)) return
    const res = await fetch(`/api/staff-accounts?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Account removed'); setStaff(s => s.filter(x => x.id !== id)) }
    else toast.error('Failed')
  }

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-dark-600 mb-4"/>
          <h2 className="font-display text-2xl text-white mb-2">Admin Only</h2>
          <p className="text-dark-400 text-sm">Settings can only be accessed by the gym administrator.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-4xl tracking-wider text-white">SETTINGS</h1>
        <p className="text-dark-300 text-sm mt-1">Manage your gym profile, membership plans, and staff access</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('gym')} className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all', tab==='gym'?'bg-lime-400 text-dark-950 font-bold':'bg-dark-800 border border-dark-600 text-dark-300')}>
          <Settings size={14}/> Gym Profile
        </button>
        <button onClick={() => setTab('plans')} className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all', tab==='plans'?'bg-lime-400 text-dark-950 font-bold':'bg-dark-800 border border-dark-600 text-dark-300')}>
          <CreditCard size={14}/> Membership Plans <span className="ml-1 bg-dark-700 text-dark-300 text-xs px-1.5 py-0.5 rounded-full">{plans.length}</span>
        </button>
        <button onClick={() => setTab('staff')} className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all', tab==='staff'?'bg-lime-400 text-dark-950 font-bold':'bg-dark-800 border border-dark-600 text-dark-300')}>
          <Users size={14}/> Staff Access <span className="ml-1 bg-dark-700 text-dark-300 text-xs px-1.5 py-0.5 rounded-full">{staff.length}</span>
        </button>
      </div>

      {/* Gym Profile */}
      {tab === 'gym' && (
        <form onSubmit={saveGym} className="card space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2"><User size={16} className="text-lime-400"/> Gym Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Gym Name</label><input value={gymData.name} onChange={e=>setGymData(d=>({...d,name:e.target.value}))} className="input" placeholder="Iron Peak Fitness"/></div>
            <div className="col-span-2"><label className="label">Address</label><input value={gymData.address} onChange={e=>setGymData(d=>({...d,address:e.target.value}))} className="input" placeholder="123 Fitness St, New York"/></div>
            <div><label className="label">Phone</label><input value={gymData.phone} onChange={e=>setGymData(d=>({...d,phone:e.target.value}))} className="input" placeholder="+1 555-0000"/></div>
            <div><label className="label">Email</label><input type="email" value={gymData.email} onChange={e=>setGymData(d=>({...d,email:e.target.value}))} className="input" placeholder="gym@example.com"/></div>
            <div><label className="label">Currency</label>
              <select value={gymData.currency} onChange={e=>setGymData(d=>({...d,currency:e.target.value}))} className="input">
                <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option><option value="EGP">EGP (E£)</option>
                <option value="AED">AED (د.إ)</option><option value="SAR">SAR (﷼)</option>
              </select>
            </div>
            <div><label className="label">Timezone</label>
              <select value={gymData.timezone} onChange={e=>setGymData(d=>({...d,timezone:e.target.value}))} className="input">
                <option value="UTC">UTC</option><option value="America/New_York">New York (ET)</option>
                <option value="America/Chicago">Chicago (CT)</option><option value="America/Los_Angeles">Los Angeles (PT)</option>
                <option value="Europe/London">London (GMT)</option><option value="Europe/Paris">Paris (CET)</option>
                <option value="Africa/Cairo">Cairo (EET)</option><option value="Asia/Dubai">Dubai (GST)</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      )}

      {/* Membership Plans */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Membership Plans</h2>
              <p className="text-dark-400 text-xs mt-0.5">These are what you assign members to when adding or editing them — each has its own price and duration.</p>
            </div>
            <button onClick={openNewPlan} className="btn-primary text-sm flex-shrink-0"><Plus size={14}/> Add Plan</button>
          </div>

          {plans.length === 0 ? (
            <div className="card text-center py-10">
              <CreditCard size={36} className="mx-auto text-dark-600 mb-3"/>
              <p className="text-white font-semibold mb-1">No membership plans yet</p>
              <p className="text-dark-400 text-sm">Create at least one plan before adding members</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map(p => (
                <div key={p.id} className={cn('card-hover flex items-center gap-4 group', !p.isActive && 'opacity-50')}>
                  <div className="w-11 h-11 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center font-bold text-lime-400 flex-shrink-0">
                    <CreditCard size={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{p.name}</span>
                      {!p.isActive && <span className="text-xs bg-dark-700 text-dark-400 border border-dark-600 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <div className="text-dark-400 text-xs">{formatCurrency(p.price)} · every {p.durationDays} day{p.durationDays !== 1 ? 's' : ''}{p.description ? ` · ${p.description}` : ''}</div>
                  </div>
                  <button onClick={() => togglePlanActive(p)} className="text-xs text-dark-400 hover:text-white px-2 py-1 flex-shrink-0">
                    {p.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button onClick={() => openEditPlan(p)} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-lime-400 transition-all flex-shrink-0">
                    <Pencil size={14}/>
                  </button>
                  <button onClick={() => deletePlan(p)} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-dark-600 transition-all flex-shrink-0">
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Staff Access */}
      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="card bg-lime-400/5 border-lime-400/20">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-lime-400 flex-shrink-0 mt-0.5"/>
              <div>
                <p className="text-white font-semibold text-sm">Role Permissions</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-lime-400 font-semibold mb-1">Admin (you)</p>
                    <p className="text-dark-300">Full access — all tabs, payroll, branches, analytics, settings, leads</p>
                  </div>
                  <div>
                    <p className="text-blue-400 font-semibold mb-1">Receptionist</p>
                    <p className="text-dark-300">Members, Classes, Attendance, Payments, Inventory, Equipment</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Receptionist Accounts</h2>
            <button onClick={() => setShowAddStaff(true)} className="btn-primary text-sm"><Plus size={14}/> Add Receptionist</button>
          </div>

          {staff.length === 0 ? (
            <div className="card text-center py-10">
              <Users size={36} className="mx-auto text-dark-600 mb-3"/>
              <p className="text-white font-semibold mb-1">No receptionists yet</p>
              <p className="text-dark-400 text-sm">Add receptionist accounts for your front desk staff</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map(s => (
                <div key={s.id} className="card-hover flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-blue-400/10 border border-blue-400/20 flex items-center justify-center font-bold text-blue-400 flex-shrink-0">
                    {getInitials(s.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{s.name}</span>
                      <span className="text-xs bg-blue-400/10 text-blue-400 border border-blue-400/20 px-2 py-0.5 rounded-full">Receptionist</span>
                    </div>
                    <div className="text-dark-400 text-xs">{s.email}</div>
                  </div>
                  <div className="text-dark-600 text-xs flex-shrink-0">
                    Added {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                  <button onClick={() => removeStaff(s.id, s.name)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-dark-600 transition-all flex-shrink-0">
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Plan Modal */}
      <AnimatePresence>
        {showPlanForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              className="bg-dark-800 border border-dark-600 rounded-2xl p-8 w-full max-w-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl tracking-wider text-white">{editingPlan ? 'EDIT PLAN' : 'NEW PLAN'}</h2>
                <button onClick={()=>setShowPlanForm(false)} className="p-2 rounded-lg hover:bg-dark-700 text-dark-400"><X size={18}/></button>
              </div>
              <form onSubmit={savePlan} className="space-y-4">
                <div><label className="label">Plan Name</label><input value={planForm.name} onChange={e=>setPlanForm(f=>({...f,name:e.target.value}))} required className="input" placeholder="e.g. Monthly, Student Monthly, 6-Month"/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Price ({gymData.currency})</label><input type="number" min="0" step="0.01" value={planForm.price} onChange={e=>setPlanForm(f=>({...f,price:e.target.value}))} required className="input" placeholder="49.00"/></div>
                  <div><label className="label">Duration (days)</label><input type="number" min="1" value={planForm.durationDays} onChange={e=>setPlanForm(f=>({...f,durationDays:e.target.value}))} required className="input" placeholder="30"/></div>
                </div>
                <div><label className="label">Description (optional)</label><input value={planForm.description} onChange={e=>setPlanForm(f=>({...f,description:e.target.value}))} className="input" placeholder="e.g. Best for casual visitors"/></div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={()=>setShowPlanForm(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={planSaving} className="btn-primary flex-1 justify-center disabled:opacity-50">{planSaving ? 'Saving…' : editingPlan ? 'Save Changes' : 'Create Plan'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Receptionist Modal */}
      <AnimatePresence>
        {showAddStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              className="bg-dark-800 border border-dark-600 rounded-2xl p-8 w-full max-w-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl tracking-wider text-white">ADD RECEPTIONIST</h2>
                <button onClick={()=>setShowAddStaff(false)} className="p-2 rounded-lg hover:bg-dark-700 text-dark-400"><X size={18}/></button>
              </div>
              <form onSubmit={addStaff} className="space-y-4">
                <div><label className="label">Full Name</label><input value={staffForm.name} onChange={e=>setStaffForm(f=>({...f,name:e.target.value}))} required className="input" placeholder="Sara White"/></div>
                <div><label className="label">Email</label><input type="email" value={staffForm.email} onChange={e=>setStaffForm(f=>({...f,email:e.target.value}))} required className="input" placeholder="sara@yourgym.com"/></div>
                <div><label className="label">Password</label>
                  <div className="relative">
                    <input type={showPw?'text':'password'} value={staffForm.password} onChange={e=>setStaffForm(f=>({...f,password:e.target.value}))} required minLength={8} className="input pr-10" placeholder="Min. 8 characters"/>
                    <button type="button" onClick={()=>setShowPw(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                      {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>
                <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-3 text-xs text-blue-300">
                  This account will have receptionist access: Members, Classes, Attendance, Payments, Inventory, Equipment.
                  Payroll, Branches, Analytics, Leads and Settings are hidden.
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={()=>setShowAddStaff(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">Create Account</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
