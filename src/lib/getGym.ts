import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// The full default set a RECEPTIONIST gets if an admin hasn't customized their permissions.
// Matches the original fixed permission set every receptionist used to have.
export const DEFAULT_RECEPTIONIST_PERMISSIONS = [
  'dashboard', 'leads', 'members', 'attendance', 'classes', 'payments', 'inventory', 'equipment',
]

export const ALL_PERMISSION_KEYS = [
  'dashboard', 'leads', 'members', 'attendance', 'classes', 'payments',
  'payroll', 'inventory', 'equipment', 'branches', 'analytics', 'import-export', 'settings',
]

/**
 * Call at the top of every API route.
 * Returns { session, gym, user, permissions, branchId } for valid users (both ADMIN and RECEPTIONIST).
 * Returns { error: NextResponse } if unauthorized or gym not found.
 *
 * Re-fetches the User fresh from the DB every call (not just from the JWT) so that permission
 * or branch changes an admin makes take effect immediately, not just after the affected
 * receptionist logs out and back in.
 */
export async function getSessionAndGym() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const sessionUserId = (session.user as any).id as string
  const dbUser = await prisma.user.findUnique({ where: { id: sessionUserId } })
  if (!dbUser) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  let gym = null

  if (dbUser.role === 'RECEPTIONIST' && dbUser.staffGymId) {
    gym = await prisma.gym.findUnique({ where: { id: dbUser.staffGymId } })
  } else {
    gym = await prisma.gym.findUnique({ where: { ownerId: dbUser.id } })
  }

  if (!gym) {
    return { error: NextResponse.json({ error: 'Gym not found. Please complete setup.' }, { status: 404 }) }
  }

  const permissions: string[] | null = dbUser.permissions ? JSON.parse(dbUser.permissions) : null
  const branchId = dbUser.branchId

  return { session, gym, user: dbUser, permissions, branchId }
}

/** Returns true if the current user is an admin (not a receptionist) */
export function isAdmin(session: any) {
  return (session?.user as any)?.role === 'ADMIN'
}

/**
 * Returns true if this user can access a given permission key.
 * Admins always pass. Receptionists pass if the key is in their custom permissions,
 * or in the default set if they haven't been customized.
 */
export function hasPermission(ctx: { user: { role: string }; permissions: string[] | null }, key: string): boolean {
  if (ctx.user.role === 'ADMIN') return true
  const perms = ctx.permissions ?? DEFAULT_RECEPTIONIST_PERMISSIONS
  return perms.includes(key)
}

/**
 * Returns a Prisma where-clause fragment scoping to this user's branch, if they have one.
 * Admins and branch-less receptionists see everything in the gym; branch-scoped
 * receptionists only see rows for their assigned branch.
 */
export function branchScope(ctx: { user: { role: string }; branchId: string | null }): { branchId?: string } {
  if (ctx.user.role === 'RECEPTIONIST' && ctx.branchId) {
    return { branchId: ctx.branchId }
  }
  return {}
}
