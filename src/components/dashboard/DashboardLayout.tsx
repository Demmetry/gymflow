'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Zap, LayoutDashboard, Users, Calendar, CreditCard, BarChart3,
  Settings, LogOut, Menu, X, Bell, UserCheck, Wrench, Target,
  Package, Building2, DollarSign, ExternalLink, Shield, FileDown, ShieldAlert,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

// key maps to the permission system in src/lib/getGym.ts — admins always see everything;
// receptionists see whatever's in their custom permissions, or the default set if uncustomized.
const ALL_NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard',      key: 'dashboard' },
      { href: '/dashboard/leads',      icon: Target,          label: 'Leads & CRM',    key: 'leads' },
      { href: '/dashboard/members',    icon: Users,           label: 'Members',         key: 'members' },
      { href: '/dashboard/attendance', icon: UserCheck,       label: 'Attendance',      key: 'attendance' },
    ],
  },
  {
    label: 'Classes & Schedule',
    items: [
      { href: '/dashboard/classes',    icon: Calendar,        label: 'Classes',          key: 'classes' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/dashboard/payments',   icon: CreditCard,      label: 'Payments',         key: 'payments' },
      { href: '/dashboard/payroll',    icon: DollarSign,      label: 'Payroll',          key: 'payroll' },
      { href: '/dashboard/inventory',  icon: Package,         label: 'Store & Inventory',key: 'inventory' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/dashboard/equipment',  icon: Wrench,          label: 'Equipment',        key: 'equipment' },
      { href: '/dashboard/branches',   icon: Building2,       label: 'Branches',         key: 'branches' },
      { href: '/dashboard/analytics',  icon: BarChart3,       label: 'Analytics',        key: 'analytics' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/dashboard/import-export', icon: FileDown, label: 'Import & Export', key: 'import-export' },
      { href: '/dashboard/settings',   icon: Settings,        label: 'Settings',         key: 'settings' },
    ],
  },
]

const DEFAULT_RECEPTIONIST_PERMISSIONS = ['dashboard', 'leads', 'members', 'attendance', 'classes', 'payments', 'inventory', 'equipment']

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const role    = (session?.user as any)?.role ?? 'ADMIN'
  const isAdmin = role === 'ADMIN'
  const isPlatformOwner = !!(session?.user as any)?.isPlatformOwner
  const userPermissions: string[] | undefined = (() => {
    const raw = (session?.user as any)?.permissions
    if (!raw) return undefined
    try { return JSON.parse(raw) } catch { return undefined }
  })()
  const effectivePermissions = userPermissions ?? DEFAULT_RECEPTIONIST_PERMISSIONS

  // Filter groups based on role/permissions — receptionists only see what they've been granted
  const navGroups = ALL_NAV_GROUPS
    .map(g => ({
      ...g,
      items: g.items.filter(item => isAdmin || effectivePermissions.includes(item.key)),
    }))
    .filter(g => g.items.length > 0)

  const userName  = session?.user?.name ?? 'User'
  const userEmail = session?.user?.email ?? ''

  return (
    <div className="min-h-screen bg-dark-950 flex">

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-dark-700 flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-dark-700 flex-shrink-0">
          <div className="w-8 h-8 bg-lime-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-dark-950" fill="currentColor" />
          </div>
          <span className="font-display text-lg tracking-wider text-white">GYMFLOW</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-dark-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-dark-600 text-xs font-mono uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                        active
                          ? 'bg-lime-400/10 text-lime-400 font-medium'
                          : 'text-dark-300 hover:text-white hover:bg-dark-800',
                      )}
                    >
                      <item.icon size={16} className="flex-shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Member portal link */}
          <div>
            <p className="text-dark-600 text-xs font-mono uppercase tracking-widest px-3 mb-1.5">
              Member Area
            </p>
            <a
              href="/portal"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dark-300 hover:text-white hover:bg-dark-800 transition-all"
            >
              <ExternalLink size={16} className="flex-shrink-0" />
              <span className="flex-1">Member Portal</span>
              <span className="text-xs bg-blue-400/15 text-blue-400 border border-blue-400/20 px-1.5 py-0.5 rounded-full font-mono leading-none">
                ↗
              </span>
            </a>
            {isPlatformOwner && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-purple-300 hover:text-white hover:bg-purple-500/10 transition-all mt-1"
              >
                <ShieldAlert size={16} className="flex-shrink-0" />
                <span className="flex-1">Platform Admin</span>
              </Link>
            )}
          </div>
        </nav>

        {/* User / logout */}
        <div className="p-3 border-t border-dark-700 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-dark-800 transition-colors">
            <div className="w-8 h-8 rounded-full bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-xs font-bold text-lime-400 flex-shrink-0">
              {getInitials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-white text-xs font-medium truncate">{userName}</span>
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0',
                  isAdmin
                    ? 'bg-lime-400/15 text-lime-400'
                    : 'bg-blue-400/15 text-blue-400',
                )}>
                  {isAdmin ? 'Admin' : 'Reception'}
                </span>
              </div>
              <div className="text-dark-400 text-xs truncate">{userEmail}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-dark-400 hover:text-red-400 transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-dark-950/90 backdrop-blur border-b border-dark-700 flex items-center gap-4 px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-dark-800 text-dark-400"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          {/* Role indicator in top bar (mobile) */}
          <span className={cn(
            'hidden sm:flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border',
            isAdmin
              ? 'bg-lime-400/10 text-lime-400 border-lime-400/20'
              : 'bg-blue-400/10 text-blue-400 border-blue-400/20',
          )}>
            <Shield size={11} />
            {isAdmin ? 'Administrator' : 'Receptionist'}
          </span>

          <button className="p-2 rounded-xl hover:bg-dark-800 text-dark-400 hover:text-white transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-lime-400" />
          </button>

          <Link href="/" className="text-xs text-dark-400 hover:text-white transition-colors">
            ← Back to site
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
