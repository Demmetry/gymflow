import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * Call at the top of every API route.
 * Returns { session, gym } for valid users (both ADMIN and RECEPTIONIST).
 * Returns { error: NextResponse } if unauthorized or gym not found.
 */
export async function getSessionAndGym() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = session.user as any

  let gym = null

  if (user.role === 'RECEPTIONIST' && user.staffGymId) {
    // Receptionist: look up gym by staffGymId
    gym = await prisma.gym.findUnique({ where: { id: user.staffGymId } })
  } else {
    // Admin: look up gym by ownerId
    gym = await prisma.gym.findUnique({ where: { ownerId: user.id } })
  }

  if (!gym) {
    return { error: NextResponse.json({ error: 'Gym not found. Please complete setup.' }, { status: 404 }) }
  }

  return { session, gym, user }
}

/** Returns true if the current user is an admin (not a receptionist) */
export function isAdmin(session: any) {
  return (session?.user as any)?.role === 'ADMIN'
}
