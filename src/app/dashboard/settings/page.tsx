'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, User, Users, Plus, Trash2, Eye, EyeOff, X, ShieldCheck, Shield } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface GymSettings { name: string; address: string; phone: string; email: string; currency: string; timezone: string }
interface StaffAccount { id: string; name: string; email: string; role: string; createdAt: string }

export default function SettingsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? 'ADMIN'
  const isAdmin = role === 'ADMIN'

  const [tab, setTab] = useState<'gym'|'staff'>('gym')
  const [gymData, setGymData] = useState<GymSettings>({ name:'', address:'', phone:'', email:'', currency:'USD', timezone:'UTC' })
  const [staff, setStaff] = useState<StaffAccount[]>([])
  const [saving, setSaving] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [staffForm, setStaffForm] = useState({ name:'', email:'', password:'' })

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d && !d.error) setGymData({ name: d.name||'', address: d.address||'', phone: d.phone||'', email: d.email||'', currency: d.currency||'USD', timezone: d.timezone||'UTC' })
    }).catch(() => {})
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
        <p className="text-dark-300 text-sm mt-1">Manage your gym profile and staff access</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('gym')} className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all', tab==='gym'?'bg-lime-400 text-dark-950 font-bold':'bg-dark-800 border border-dark-600 text-dark-300')}>
          <Settings size={14}/> Gym Profile
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
