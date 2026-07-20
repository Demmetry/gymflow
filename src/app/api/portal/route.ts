import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const bookClassSchema = z.object({
  _type:    z.literal('book_class'),
  classId:  z.string().min(1),
  memberId: z.string().min(1),
})

const addProgressSchema = z.object({
  _type:    z.literal('add_progress'),
  memberId: z.string().min(1),
  weight:   z.coerce.number().min(0).max(2000).optional().nullable(),
  bodyFat:  z.coerce.number().min(0).max(100).optional().nullable(),
  waist:    z.coerce.number().min(0).max(500).optional().nullable(),
  notes:    z.string().trim().max(500).optional().nullable(),
})

// Public portal - member accesses via email lookup (no auth needed, just email+gymSlug)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const gymSlug = searchParams.get('gym')
  if (!email || !gymSlug) return NextResponse.json({ error: 'email and gym required' }, { status: 400 })
  const gym = await prisma.gym.findUnique({ where: { slug: gymSlug } })
  if (!gym) return NextResponse.json({ error: 'Gym not found' }, { status: 404 })
  const member = await prisma.member.findFirst({
    where: { gymId: gym.id, email },
    include: {
      checkIns: { orderBy: { checkedIn: 'desc' }, take: 10 },
      classBookings: { include: { class: true }, orderBy: { bookedAt: 'desc' }, take: 5 },
      workoutPlans: { where: { isActive: true }, include: { exercises: true }, take: 1 },
      progress: { orderBy: { recordedAt: 'desc' }, take: 5 },
    },
  })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  const upcomingClasses = await prisma.gymClass.findMany({
    where: { gymId: gym.id, startTime: { gte: new Date() } },
    include: { trainer: true },
    orderBy: { startTime: 'asc' },
    take: 10,
  })
  return NextResponse.json({ member, gym: { name: gym.name, slug: gym.slug }, upcomingClasses })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.json()

  if (rawBody._type === 'book_class') {
    const parsed = bookClassSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const body = parsed.data
    const existing = await prisma.classBooking.findFirst({ where: { classId: body.classId, memberId: body.memberId } })
    if (existing) return NextResponse.json({ error: 'Already booked' }, { status: 409 })
    const booking = await prisma.classBooking.create({ data: { classId: body.classId, memberId: body.memberId } })
    return NextResponse.json(booking)
  }
  if (rawBody._type === 'add_progress') {
    const parsed = addProgressSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const body = parsed.data
    const progress = await prisma.memberProgress.create({ data: { memberId: body.memberId, weight: body.weight, bodyFat: body.bodyFat, waist: body.waist, notes: body.notes } })
    return NextResponse.json(progress)
  }
  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
