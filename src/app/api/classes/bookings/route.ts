import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

const bookSchema = z.object({
  classId: z.string().min(1),
  memberId: z.coerce.number().int().min(1),
})

const updateSchema = z.object({
  status: z.enum(['CONFIRMED', 'WAITLIST', 'CANCELED', 'ATTENDED']),
})

export async function GET(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const classId = new URL(req.url).searchParams.get('classId')
  if (!classId) return NextResponse.json({ error: 'classId is required' }, { status: 400 })

  const cls = await prisma.gymClass.findFirst({ where: { id: classId, gymId: gym.id } })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const bookings = await prisma.classBooking.findMany({
    where: { classId, status: { not: 'CANCELED' } },
    select: {
      id: true, status: true, bookedAt: true,
      member: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { bookedAt: 'asc' },
  })
  return NextResponse.json(bookings)
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const parsed = bookSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { classId, memberId } = parsed.data

  const cls = await prisma.gymClass.findFirst({ where: { id: classId, gymId: gym.id } })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: gym.id } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const existing = await prisma.classBooking.findFirst({ where: { classId, memberId } })
  if (existing && existing.status !== 'CANCELED') {
    return NextResponse.json({ error: 'This member is already booked into this class' }, { status: 409 })
  }

  const confirmedCount = await prisma.classBooking.count({ where: { classId, status: { in: ['CONFIRMED', 'ATTENDED'] } } })
  const status = confirmedCount >= cls.capacity ? 'WAITLIST' : 'CONFIRMED'

  const booking = existing
    ? await prisma.classBooking.update({ where: { id: existing.id }, data: { status, bookedAt: new Date() } })
    : await prisma.classBooking.create({ data: { classId, memberId, status } })

  return NextResponse.json({ ...booking, waitlisted: status === 'WAITLIST' })
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const booking = await prisma.classBooking.findFirst({ where: { id, class: { gymId: gym.id } } })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const updated = await prisma.classBooking.update({ where: { id }, data: { status: parsed.data.status } })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })

  const booking = await prisma.classBooking.findFirst({ where: { id, class: { gymId: gym.id } } })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  await prisma.classBooking.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
