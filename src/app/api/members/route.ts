import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

function calcEndDate(start: Date, type: string): Date {
  const d = new Date(start)
  switch (type) {
    case 'DAILY':      d.setDate(d.getDate() + 1); break
    case 'MONTHLY':    d.setMonth(d.getMonth() + 1); break
    case 'QUARTERLY':  d.setMonth(d.getMonth() + 3); break
    case 'ANNUAL':     d.setFullYear(d.getFullYear() + 1); break
    default:           d.setMonth(d.getMonth() + 1)
  }
  return d
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
  const id = searchParams.get('id')
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  if (id) {
    const member = await prisma.member.findFirst({
      where: { id, gymId: gym.id },
      include: {
        checkIns: { orderBy: { checkedIn: 'desc' }, take: 60 },
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        classBookings: { include: { class: true }, orderBy: { bookedAt: 'desc' }, take: 5 },
      },
    })
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const attendancePct = calcAttendance(member.checkIns, member.startDate, member.endDate)
    return NextResponse.json({ ...member, attendancePct })
  }

  const members = await prisma.member.findMany({
    where: {
      gymId: gym.id,
      ...(status && status !== 'ALL' ? { membershipStatus: status } : {}),
      ...(search ? { OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }, { email: { contains: search } }] } : {}),
    },
    include: { checkIns: { orderBy: { checkedIn: 'desc' }, take: 60 } },
    orderBy: { createdAt: 'desc' },
  })

  const now = new Date()
  const membersWithStats = await Promise.all(members.map(async m => {
    if (m.endDate && new Date(m.endDate) < now && m.membershipStatus === 'ACTIVE') {
      await prisma.member.update({ where: { id: m.id }, data: { membershipStatus: 'EXPIRED' } })
      m.membershipStatus = 'EXPIRED'
    }
    return { ...m, attendancePct: calcAttendance(m.checkIns, m.startDate, m.endDate) }
  }))

  return NextResponse.json(membersWithStats)
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  try {
    const body = await req.json()
    const startDate = body.startDate ? new Date(body.startDate) : new Date()
    const endDate = calcEndDate(startDate, body.membershipType || 'MONTHLY')
    const member = await prisma.member.create({
      data: { ...body, gymId: gym.id, startDate, endDate, membershipStatus: 'ACTIVE' },
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
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const member = await prisma.member.findFirst({ where: { id, gymId: gym.id } })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const action = body._action; delete body._action

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
    const newStart = new Date()
    const newEnd = calcEndDate(newStart, member.membershipType)
    await prisma.member.update({ where: { id }, data: { membershipStatus: 'ACTIVE', startDate: newStart, endDate: newEnd, freezeWeeks: 0, freezeStartedAt: null } })
    return NextResponse.json({ success: true, message: `Renewed until ${newEnd.toDateString()}` })
  }
  if (action === 'cancel') {
    await prisma.member.update({ where: { id }, data: { membershipStatus: 'CANCELED', freezeStartedAt: null, freezeWeeks: 0 } })
    return NextResponse.json({ success: true, message: 'Subscription canceled.' })
  }
  if (action === 'expire') {
    await prisma.member.update({ where: { id }, data: { membershipStatus: 'EXPIRED' } })
    return NextResponse.json({ success: true, message: 'Marked as expired.' })
  }

  const updateData: any = {}
  const allowedFields = ['firstName','lastName','email','phone','goals','notes','healthConditions','emergencyContact','emergencyPhone','branchId']
  for (const field of allowedFields) {
    if (body[field] !== undefined) updateData[field] = body[field] ?? null
  }
  if (body.membershipType) updateData.membershipType = body.membershipType
  if (body.membershipStatus) updateData.membershipStatus = body.membershipStatus
  if (body.startDate || body.membershipType) {
    const base = body.startDate ? new Date(body.startDate) : new Date(member.startDate)
    if (body.startDate) updateData.startDate = base
    updateData.endDate = calcEndDate(base, body.membershipType || member.membershipType)
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
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const member = await prisma.member.findFirst({ where: { id, gymId: gym.id } })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.member.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
