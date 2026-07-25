import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requirePlatformOwner() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const userId = (session.user as any).id as string
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.isPlatformOwner) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user }
}

const updateGymSchema = z.object({
  plan:       z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  planStatus: z.enum(['ACTIVE', 'PAST_DUE', 'CANCELED']).optional(),
})

export async function GET() {
  const check = await requirePlatformOwner()
  if ('error' in check) return check.error

  const gyms = await prisma.gym.findMany({
    select: {
      id: true, name: true, slug: true, plan: true, planStatus: true, createdAt: true,
      owner: { select: { email: true, name: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Revenue per gym, computed separately since it's an aggregate, not a plain relation count
  const gymsWithRevenue = await Promise.all(gyms.map(async g => {
    const revenue = await prisma.payment.aggregate({
      where: { gymId: g.id, status: 'COMPLETED' },
      _sum: { amount: true },
    })
    return { ...g, totalRevenue: revenue._sum.amount || 0 }
  }))

  const totals = {
    gymCount: gyms.length,
    activeCount: gyms.filter(g => g.planStatus === 'ACTIVE').length,
    totalMembers: gyms.reduce((sum, g) => sum + g._count.members, 0),
    totalRevenue: gymsWithRevenue.reduce((sum, g) => sum + g.totalRevenue, 0),
  }

  return NextResponse.json({ gyms: gymsWithRevenue, totals })
}

export async function PATCH(req: NextRequest) {
  const check = await requirePlatformOwner()
  if ('error' in check) return check.error

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Gym ID required' }, { status: 400 })

  const gym = await prisma.gym.findUnique({ where: { id } })
  if (!gym) return NextResponse.json({ error: 'Gym not found' }, { status: 404 })

  const parsed = updateGymSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const data: any = {}
  if (parsed.data.plan       !== undefined) data.plan       = parsed.data.plan
  if (parsed.data.planStatus !== undefined) data.planStatus = parsed.data.planStatus

  const updated = await prisma.gym.update({ where: { id }, data })
  return NextResponse.json(updated)
}
