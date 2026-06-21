'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, MapPin, Phone, Mail, Users, DollarSign, ToggleLeft, Trash2, X, TrendingUp } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Branch { id:string; name:string; address?:string; phone?:string; email?:string; manager?:string; isActive:boolean; createdAt:string }

export default function BranchesPage() {
  const [data, setData] = useState<{ branches: Branch[]; gymStats: { memberCount:number; totalRevenue:number } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Branch | null>(null)
  const [form, setForm] = useState({ name:'', address:'', phone:'', email:'', manager:'' })

  function load() {
    setLoading(true)
    fetch('/api/branches').then(r=>r.json()).then(d=>{ setData(d); setLoading(false) }).catch(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[])

  async function addBranch(e:React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/branches', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    if(res.ok){ toast.success('Branch added!'); setShowForm(false); setForm({name:'',address:'',phone:'',email:'',manager:''}); load() } else toast.error('Failed')
  }

  async function toggleActive(branch:Branch) {
    await fetch(`/api/branches?id=${branch.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({isActive:!branch.isActive}) })
    toast.success(branch.isActive ? 'Branch deactivated' : 'Branch activated'); load()
  }

  async function deleteBranch(id:string) {
    await fetch(`/api/branches?id=${id}`, { method:'DELETE' })
    toast.success('Branch deleted'); load()
  }

  const branches = data?.branches || []
  const stats = data?.gymStats

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">BRANCHES</h1>
          <p className="text-dark-300 text-sm mt-1">Manage multiple gym locations from one dashboard</p>
        </div>
        <button onClick={()=>setShowForm(true)} className="btn-primary"><Plus size={16}/> Add Branch</button>
      </div>

      {/* Network overview */}
      <div className="bg-gradient-to-r from-lime-400/10 to-lime-400/5 border border-lime-400/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-lime-400/20 rounded-xl flex items-center justify-center"><TrendingUp size={20} className="text-lime-400"/></div>
          <div>
            <h3 className="text-white font-semibold">Network Overview</h3>
            <p className="text-dark-400 text-xs">All branches combined</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div><div className="font-display text-3xl text-white">{branches.length}</div><div className="text-dark-400 text-xs mt-0.5">Total Branches</div></div>
          <div><div className="font-display text-3xl text-lime-400">{stats?.memberCount ?? '—'}</div><div className="text-dark-400 text-xs mt-0.5">Active Members</div></div>
          <div><div className="font-display text-3xl text-lime-400">{stats ? formatCurrency(stats.totalRevenue) : '—'}</div><div className="text-dark-400 text-xs mt-0.5">Total Revenue</div></div>
        </div>
      </div>

      {/* Branches grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="h-48 skeleton rounded-2xl"/>)}</div>
      ) : branches.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 size={48} className="mx-auto text-dark-600 mb-4"/>
          <p className="text-white font-semibold mb-1">No branches yet</p>
          <p className="text-dark-400 text-sm">Your main gym is the primary location. Add branches to manage a chain.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch,i) => (
            <motion.div key={branch.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
              className="card-hover group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-lime-400/10 border border-lime-400/20 rounded-xl flex items-center justify-center">
                  <Building2 size={18} className="text-lime-400"/>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn('badge text-xs', branch.isActive?'text-lime-400 bg-lime-400/10 border-lime-400/20':'text-red-400 bg-red-400/10 border-red-400/20')}>
                    {branch.isActive?'Active':'Inactive'}
                  </span>
                </div>
              </div>

              <h3 className="text-white font-semibold text-lg mb-3">{branch.name}</h3>

              <div className="space-y-2 mb-4">
                {branch.address && <div className="flex items-start gap-2 text-dark-400 text-xs"><MapPin size={12} className="mt-0.5 flex-shrink-0"/><span>{branch.address}</span></div>}
                {branch.phone && <div className="flex items-center gap-2 text-dark-400 text-xs"><Phone size={12}/><span>{branch.phone}</span></div>}
                {branch.email && <div className="flex items-center gap-2 text-dark-400 text-xs"><Mail size={12}/><span>{branch.email}</span></div>}
                {branch.manager && <div className="flex items-center gap-2 text-dark-400 text-xs"><Users size={12}/><span>Manager: {branch.manager}</span></div>}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-dark-700">
                <button onClick={()=>toggleActive(branch)} className="flex-1 text-xs py-2 rounded-lg border border-dark-600 text-dark-400 hover:text-white hover:border-dark-500 transition-colors flex items-center justify-center gap-1.5">
                  <ToggleLeft size={14}/>{branch.isActive?'Deactivate':'Activate'}
                </button>
                <button onClick={()=>deleteBranch(branch.id)} className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-dark-600 transition-all">
                  <Trash2 size={14}/>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Branch Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              className="bg-dark-800 border border-dark-600 rounded-2xl p-8 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl tracking-wider text-white">ADD BRANCH</h2>
                <button onClick={()=>setShowForm(false)} className="p-2 rounded-lg hover:bg-dark-700 text-dark-400"><X size={18}/></button>
              </div>
              <form onSubmit={addBranch} className="space-y-4">
                <div><label className="label">Branch Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required className="input" placeholder="e.g. Downtown Branch"/></div>
                <div><label className="label">Address</label><input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} className="input" placeholder="123 Main St, City"/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Phone</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className="input"/></div>
                  <div><label className="label">Email</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="input"/></div>
                </div>
                <div><label className="label">Branch Manager</label><input value={form.manager} onChange={e=>setForm(f=>({...f,manager:e.target.value}))} className="input" placeholder="Manager's name"/></div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={()=>setShowForm(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">Add Branch</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
