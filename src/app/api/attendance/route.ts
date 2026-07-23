import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

const checkInSchema = z.object({
  memberId: z.string().min(1, 'memberId is required'),
  method: z.enum(['MANUAL', 'QR']).optional(),
})

const listQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).optional().default(1),
  limit:    z.coerce.number().int().min(1).max(100).optional().default(50),
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
})

const memberSearchSchema = z.object({
  search: z.string().trim().max(100).optional(),
  page:   z.coerce.number().int().min(1).optional().default(1),
  limit:  z.coerce.number().int().min(1).max(50).optional().default(20),
})

// GET: list today's check-ins + members for manual check-in
export async function GET(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') // 'today' | 'members'

  if (view === 'members') {
    const parsed = memberSearchSchema.safeParse({
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const { search, page, limit } = parsed.data

    const where: any = {
      gymId: gym.id,
      membershipStatus: 'ACTIVE',
      ...(search ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          ...(Number.isInteger(Number(search)) ? [{ memberNumber: Number(search) }] : []),
        ],
      } : {}),
    }

    const total = await prisma.member.count({ where })
    const members = await prisma.member.findMany({
      where,
      orderBy: [{ firstName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    })
    return NextResponse.json({ members, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) })
  }

  // Check-ins list, defaulting to today if no date range given (preserves prior behavior)
  const listParsed = listQuerySchema.safeParse({
    page: searchParams.get('page') || undefined,
    limit: searchParams.get('limit') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  })
  if (!listParsed.success) return NextResponse.json({ error: listParsed.error.issues[0].message }, { status: 400 })
  const { page, limit, dateFrom, dateTo } = listParsed.data

  let rangeStart: Date
  let rangeEnd: Date
  if (dateFrom || dateTo) {
    rangeStart = dateFrom ? new Date(dateFrom) : new Date(0)
    rangeEnd = dateTo ? new Date(dateTo) : new Date()
    if (isNaN(rangeStart.getTime())) return NextResponse.json({ error: 'Invalid dateFrom' }, { status: 400 })
    if (isNaN(rangeEnd.getTime())) return NextResponse.json({ error: 'Invalid dateTo' }, { status: 400 })
    rangeEnd.setHours(23, 59, 59, 999)
  } else {
    rangeStart = new Date(); rangeStart.setHours(0, 0, 0, 0)
    rangeEnd = new Date(rangeStart); rangeEnd.setDate(rangeEnd.getDate() + 1)
  }

  const checkInWhere = { member: { gymId: gym.id }, checkedIn: { gte: rangeStart, lt: rangeEnd } }
  const totalCheckIns = await prisma.checkIn.count({ where: checkInWhere })
  const checkIns = await prisma.checkIn.findMany({
    where: checkInWhere,
    include: { member: true },
    orderBy: { checkedIn: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  // Weekly stats
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weeklyCheckIns = await prisma.checkIn.count({
    where: { member: { gymId: gym.id }, checkedIn: { gte: weekAgo } },
  })

  // Inactive members (no check-in in 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentlyActive = await prisma.checkIn.findMany({
    where: { member: { gymId: gym.id }, checkedIn: { gte: thirtyDaysAgo } },
    select: { memberId: true },
    distinct: ['memberId'],
  })
  const activeIds = recentlyActive.map(c => c.memberId)
  const inactiveCount = await prisma.member.count({
    where: { gymId: gym.id, membershipStatus: 'ACTIVE', id: { notIn: activeIds } },
  })

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1)
  const todayCount = await prisma.checkIn.count({
    where: { member: { gymId: gym.id }, checkedIn: { gte: todayStart, lt: todayEnd } },
  })

  return NextResponse.json({
    checkIns, todayCount, weeklyCheckIns, inactiveCount,
    total: totalCheckIns, page, limit, totalPages: Math.max(1, Math.ceil(totalCheckIns / limit)),
  })
}

// POST: log a check-in
export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const parsed = checkInSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { memberId, method = 'MANUAL' } = parsed.data

  // Verify member belongs to this gym
  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: gym.id } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (member.membershipStatus !== 'ACTIVE') return NextResponse.json({ error: 'Membership is not active' }, { status: 403 })

  // Prevent duplicate check-in same day
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)
  const existing = await prisma.checkIn.findFirst({
    where: { memberId, checkedIn: { gte: today, lt: tomorrow } },
  })
  if (existing) return NextResponse.json({ error: 'Already checked in today' }, { status: 409 })

  const checkIn = await prisma.checkIn.create({ data: { memberId, method } })
  return NextResponse.json(checkIn)
}
