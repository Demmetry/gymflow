import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'

async function verifyMember(email: string, gymSlug: string, pin: string) {
  const gym = await prisma.gym.findUnique({ where: { slug: gymSlug } })
  if (!gym) return { error: NextResponse.json({ error: 'Gym not found' }, { status: 404 }) }

  const rateLimit = await checkRateLimit(`portal:${email}:${gymSlug}`)
  if (!rateLimit.allowed) {
    return { error: NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 }) }
  }

  const member = await prisma.member.findFirst({ where: { gymId: gym.id, email } })
  if (!member || !member.portalPin || member.portalPin !== pin) {
    return { error: NextResponse.json({ error: 'Invalid email, gym, or PIN' }, { status: 401 }) }
  }
  return { gym, member }
}

const loginSchema = z.object({
  email:   z.string().trim().toLowerCase().email('Invalid email address'),
  gymSlug: z.string().trim().min(1),
  pin:     z.string().trim().min(4).max(10),
})

const bookClassSchema = z.object({
  _type:   z.literal('book_class'),
  classId: z.string().min(1),
  email:   z.string().trim().toLowerCase().email(),
  gymSlug: z.string().trim().min(1),
  pin:     z.string().trim().min(4).max(10),
})

const addProgressSchema = z.object({
  _type:   z.literal('add_progress'),
  email:   z.string().trim().toLowerCase().email(),
  gymSlug: z.string().trim().min(1),
  pin:     z.string().trim().min(4).max(10),
  weight:  z.coerce.number().min(0).max(2000).optional().nullable(),
  bodyFat: z.coerce.number().min(0).max(100).optional().nullable(),
  waist:   z.coerce.number().min(0).max(500).optional().nullable(),
  notes:   z.string().trim().max(500).optional().nullable(),
})

// Portal login — requires the member's PIN in addition to email + gym, and is rate limited
// against PIN guessing (4-6 digit PINs are weak on their own without a real attempt limit).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsed = loginSchema.safeParse({
    email: searchParams.get('email'),
    gymSlug: searchParams.get('gym'),
    pin: searchParams.get('pin'),
  })
  if (!parsed.success) return NextResponse.json({ error: 'Email, gym, and PIN are required' }, { status: 400 })

  const verified = await verifyMember(parsed.data.email, parsed.data.gymSlug, parsed.data.pin)
  if ('error' in verified) return verified.error
  const { gym, member: baseMember } = verified

  const member = await prisma.member.findUnique({
    where: { id: baseMember.id },
    include: {
      checkIns: { orderBy: { checkedIn: 'desc' }, take: 10 },
      classBookings: { include: { class: true }, orderBy: { bookedAt: 'desc' }, take: 5 },
      workoutPlans: { where: { isActive: true }, include: { exercises: true }, take: 1 },
      progress: { orderBy: { recordedAt: 'desc' }, take: 5 },
    },
  })
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
    const verified = await verifyMember(body.email, body.gymSlug, body.pin)
    if ('error' in verified) return verified.error
    const { member } = verified

    const existing = await prisma.classBooking.findFirst({ where: { classId: body.classId, memberId: member.id } })
    if (existing) return NextResponse.json({ error: 'Already booked' }, { status: 409 })
    const booking = await prisma.classBooking.create({ data: { classId: body.classId, memberId: member.id } })
    return NextResponse.json(booking)
  }

  if (rawBody._type === 'add_progress') {
    const parsed = addProgressSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const body = parsed.data
    const verified = await verifyMember(body.email, body.gymSlug, body.pin)
    if ('error' in verified) return verified.error
    const { member } = verified

    const progress = await prisma.memberProgress.create({
      data: { memberId: member.id, weight: body.weight, bodyFat: body.bodyFat, waist: body.waist, notes: body.notes },
    })
    return NextResponse.json(progress)
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
