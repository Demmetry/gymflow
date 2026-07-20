import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

const createPlanSchema = z.object({
  memberId:    z.string().min(1),
  title:       z.string().trim().min(1, 'Title is required').max(100),
  description: z.string().trim().max(2000).optional().nullable(),
  goal:        z.enum(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'FLEXIBILITY']).optional().nullable(),
  weeks:       z.coerce.number().int().min(1).max(104).optional(),
})

export async function GET(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })

  const plans = await prisma.workoutPlan.findMany({
    where: { memberId, gymId: gym.id },
    include: { exercises: { orderBy: { day: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const body = await req.json()
  const parsed = createPlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { memberId, title, description, goal, weeks } = parsed.data

  const member = await prisma.member.findFirst({ where: { id: memberId, gymId: gym.id } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const plan = await prisma.workoutPlan.create({
    data: {
      gymId:       gym.id,
      memberId:    member.id,
      title:       title,
      description: description || null,
      goal:        goal || null,
      weeks:       weeks || 4,
      isActive:    true,
    },
    include: { exercises: true },
  })

  return NextResponse.json(plan)
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Plan id is required' }, { status: 400 })

  const plan = await prisma.workoutPlan.findFirst({ where: { id, gymId: gym.id } })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  await prisma.workoutPlan.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
