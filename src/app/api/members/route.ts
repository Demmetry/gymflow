import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

const listQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).optional().default(1),
  limit:  z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().trim().max(30).optional(),
  search: z.string().trim().max(100).optional(),
})

const createMemberSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName:  z.string().trim().min(1, 'Last name is required').max(100),
  email:     z.string().trim().toLowerCase().email('Invalid email'),
  phone:     z.string().trim().max(30).optional().nullable(),
  planId:    z.string().min(1, 'A membership plan is required'),
  branchId:  z.string().optional().nullable(),
  goals:     z.string().trim().max(1000).optional().nullable(),
  healthConditions: z.string().trim().max(1000).optional().nullable(),
  notes:            z.string().trim().max(1000).optional().nullable(),
  emergencyContact: z.string().trim().max(100).optional().nullable(),
  emergencyPhone:   z.string().trim().max(30).optional().nullable(),
  startDate:        z.string().optional(),
  discountType:  z.enum(['PERCENT', 'FLAT']).optional().nullable(),
  discountValue: z.coerce.number().min(0).optional().nullable(),
})

const renewSchema = z.object({
  discountType:  z.enum(['PERCENT', 'FLAT']).optional().nullable(),
  discountValue: z.coerce.number().min(0).optional().nullable(),
})

function calcEndDateFromDays(start: Date, days: number): Date {
  const d = new Date(start)
  d.setDate(d.getDate() + days)
  return d
}

function applyDiscount(baseAmount: number, discountType?: string | null, discountValue?: number | null): number {
  if (!discountType || !discountValue) return baseAmount
  if (discountType === 'PERCENT') return Math.max(0, Math.round((baseAmount - (baseAmount * discountValue / 100)) * 100) / 100)
  if (discountType === 'FLAT') return Math.max(0, Math.round((baseAmount - discountValue) * 100) / 100)
  return baseAmount
}

function calcAttendance(checkIns: { checkedIn: Date }[], startDate: Date, endDate?: Date | null): number {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const now = new Date()
  const periodEnd = end < now ? end : now
  const daysInPeriod = Math.max(1, Math.ceil((periodEnd.getTime() - start.getTime()) / 86400000))
  const validCheckIns = checkIns.filter(c => {
    const d = new Date(c.checkedIn)
    return d >= start && d <= periodEnd
  })
  const expectedVisits = Math.max(1, Math.ceil(daysInPeriod / 7 * 3))
  return Math.min(100, Math.round((validCheckIns.length / expectedVisits) * 100))
}

export async function GET(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const { searchParams } = new URL(req.url)
  const idParam = searchParams.get('id')

  if (idParam) {
    const id = Number(idParam)
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid member id' }, { status: 400 })
    const member = await prisma.member.findFirst({
      where: { id, gymId: gym.id },
      include: {
        plan: true,
        checkIns: { orderBy: { checkedIn: 'desc' }, take: 60 },
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        classBookings: { include: { class: true }, orderBy: { bookedAt: 'desc' }, take: 5 },
        workoutPlans: { include: { exercises: { orderBy: { day: 'asc' } } }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const attendancePct = calcAttendance(member.checkIns, member.startDate, member.endDate)
    return NextResponse.json({ ...member, attendancePct })
  }

  const parsed = listQuerySchema.safeParse({
    page: searchParams.get('page') || undefined,
    limit: searchParams.get('limit') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { page, limit, status, search } = parsed.data

  const where: any = {
    gymId: gym.id,
    ...(status && status !== 'ALL' ? { membershipStatus: status } : {}),
    ...(search ? {
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        ...(Number.isInteger(Number(search)) ? [{ id: Number(search) }] : []),
      ],
    } : {}),
  }

  const total = await prisma.member.count({ where })
  const members = await prisma.member.findMany({
    where,
    select: {
      id: true, firstName: true, lastName: true, email: true,
      membershipType: true, membershipStatus: true, endDate: true, startDate: true,
      checkIns: { orderBy: { checkedIn: 'desc' }, take: 60, select: { checkedIn: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  const now = new Date()
  const membersWithStats = await Promise.all(members.map(async m => {
    if (m.endDate && new Date(m.endDate) < now && m.membershipStatus === 'ACTIVE') {
      await prisma.member.update({ where: { id: m.id }, data: { membershipStatus: 'EXPIRED' } })
      m.membershipStatus = 'EXPIRED'
    }
    const attendancePct = calcAttendance(m.checkIns, m.startDate, m.endDate)
    const { checkIns, startDate, ...rest } = m
    return { ...rest, attendancePct }
  }))

  return NextResponse.json({
    members: membersWithStats,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const parsed = createMemberSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = parsed.data

  const plan = await prisma.membershipPlan.findFirst({ where: { id: body.planId, gymId: gym.id, isActive: true } })
  if (!plan) return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 })

  try {
    const startDate = body.startDate ? new Date(body.startDate) : new Date()
    const endDate = calcEndDateFromDays(startDate, plan.durationDays)

    const member = await prisma.member.create({
      data: {
        gymId:            gym.id,
        firstName:        body.firstName,
        lastName:         body.lastName,
        email:            body.email,
        phone:            body.phone            || null,
        planId:           plan.id,
        membershipType:   plan.name,
        membershipStatus: 'ACTIVE',
        startDate,
        endDate,
        branchId:         body.branchId         || null,
        goals:            body.goals            || null,
        healthConditions: body.healthConditions || null,
        notes:            body.notes            || null,
        emergencyContact: body.emergencyContact || null,
        emergencyPhone:   body.emergencyPhone   || null,
        portalPin:        String(Math.floor(100000 + Math.random() * 900000)),
      },
    })

    const finalAmount = applyDiscount(plan.price, body.discountType, body.discountValue)
    await prisma.payment.create({
      data: {
        gymId:          gym.id,
        memberId:       member.id,
        amount:         finalAmount,
        originalAmount: plan.price,
        discountType:   body.discountType || null,
        discountValue:  body.discountValue || null,
        currency:       gym.currency || 'USD',
        type:           'MEMBERSHIP',
        status:         'COMPLETED',
        method:         'CASH',
        description:    `New membership — ${member.firstName} ${member.lastName} (${plan.name})`,
        paidAt:         new Date(),
      },
    })

    return NextResponse.json(member)
  } catch (err: any) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'Member with this email already exists' }, { status: 409 })
    console.error(err)
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const idParam = new URL(req.url).searchParams.get('id')
  const id = Number(idParam)
  if (!idParam || !Number.isInteger(id)) return NextResponse.json({ error: 'Valid ID required' }, { status: 400 })

  const member = await prisma.member.findFirst({ where: { id, gymId: gym.id } })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rawBody = await req.json()
  const action = rawBody._action; delete rawBody._action

  if (action === 'freeze') {
    const now = new Date()
    const currentEnd = member.endDate ? new Date(member.endDate) : now
    const msLeft = Math.max(0, currentEnd.getTime() - now.getTime())
    await prisma.member.update({ where: { id }, data: { membershipStatus: 'FROZEN', freezeStartedAt: now, totalFreezeWeeks: Math.round(msLeft / 86400000), freezeWeeks: 0 } })
    return NextResponse.json({ success: true, message: `Frozen. ${Math.ceil(msLeft / 86400000)} days paused.` })
  }
  if (action === 'unfreeze') {
    const daysLeft = member.totalFreezeWeeks || 0
    const newEnd = new Date(); newEnd.setDate(newEnd.getDate() + daysLeft)
    await prisma.member.update({ where: { id }, data: { membershipStatus: 'ACTIVE', endDate: newEnd, freezeStartedAt: null, freezeWeeks: 0, totalFreezeWeeks: 0 } })
    return NextResponse.json({ success: true, message: `Unfrozen! ${daysLeft} days restored. Expires ${newEnd.toDateString()}` })
  }
  if (action === 'renew') {
    const parsed = renewSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const { discountType, discountValue } = parsed.data

    if (!member.planId) return NextResponse.json({ error: 'This member has no membership plan assigned. Edit the member to assign one before renewing.' }, { status: 400 })
    const plan = await prisma.membershipPlan.findFirst({ where: { id: member.planId, gymId: gym.id } })
    if (!plan) return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 })

    const newStart = new Date()
    const newEnd = calcEndDateFromDays(newStart, plan.durationDays)
    await prisma.member.update({ where: { id }, data: { membershipStatus: 'ACTIVE', startDate: newStart, endDate: newEnd, freezeWeeks: 0, freezeStartedAt: null } })

    const finalAmount = applyDiscount(plan.price, discountType, discountValue)
    await prisma.payment.create({
      data: {
        gymId:          gym.id,
        memberId:       member.id,
        amount:         finalAmount,
        originalAmount: plan.price,
        discountType:   discountType || null,
        discountValue:  discountValue || null,
        currency:       gym.currency || 'USD',
        type:           'MEMBERSHIP',
        status:         'COMPLETED',
        method:         'CASH',
        description:    `Renewal — ${member.firstName} ${member.lastName} (${plan.name})`,
        paidAt:         new Date(),
      },
    })

    return NextResponse.json({ success: true, message: `Renewed until ${newEnd.toDateString()}`, amountCharged: finalAmount })
  }
  if (action === 'cancel') {
    await prisma.member.update({ where: { id }, data: { membershipStatus: 'CANCELED', freezeStartedAt: null, freezeWeeks: 0 } })
    return NextResponse.json({ success: true, message: 'Subscription canceled.' })
  }
  if (action === 'expire') {
    await prisma.member.update({ where: { id }, data: { membershipStatus: 'EXPIRED' } })
    return NextResponse.json({ success: true, message: 'Marked as expired.' })
  }
  if (action === 'regeneratePin') {
    const newPin = String(Math.floor(100000 + Math.random() * 900000))
    await prisma.member.update({ where: { id }, data: { portalPin: newPin } })
    return NextResponse.json({ success: true, pin: newPin, message: `New PIN: ${newPin}` })
  }

  const updateData: any = {}
  const allowedFields = ['firstName','lastName','email','phone','goals','notes','healthConditions','emergencyContact','emergencyPhone','branchId']
  for (const field of allowedFields) {
    if (rawBody[field] !== undefined) updateData[field] = rawBody[field] ?? null
  }
  if (rawBody.membershipStatus) updateData.membershipStatus = rawBody.membershipStatus

  if (rawBody.planId && rawBody.planId !== member.planId) {
    const newPlan = await prisma.membershipPlan.findFirst({ where: { id: rawBody.planId, gymId: gym.id } })
    if (!newPlan) return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 })
    updateData.planId = newPlan.id
    updateData.membershipType = newPlan.name
    const base = rawBody.startDate ? new Date(rawBody.startDate) : new Date(member.startDate)
    updateData.endDate = calcEndDateFromDays(base, newPlan.durationDays)
    if (rawBody.startDate) updateData.startDate = base
  } else if (rawBody.startDate) {
    updateData.startDate = new Date(rawBody.startDate)
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.member.update({ where: { id }, data: updateData })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const idParam = new URL(req.url).searchParams.get('id')
  const id = Number(idParam)
  if (!idParam || !Number.isInteger(id)) return NextResponse.json({ error: 'Valid ID required' }, { status: 400 })

  const member = await prisma.member.findFirst({ where: { id, gymId: gym.id } })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.member.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
