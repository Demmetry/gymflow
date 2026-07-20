import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

const addExerciseSchema = z.object({
  planId: z.string().min(1),
  name:   z.string().trim().min(1, 'Exercise name is required').max(100),
  sets:   z.coerce.number().int().min(1).max(20).optional(),
  reps:   z.string().trim().max(20).optional(),
  rest:   z.coerce.number().int().min(0).max(3600).optional(),
  day:    z.coerce.number().int().min(1).max(7).optional(),
  notes:  z.string().trim().max(500).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const body = await req.json()
  const parsed = addExerciseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { planId, name, sets, reps, rest, day, notes } = parsed.data

  const plan = await prisma.workoutPlan.findFirst({ where: { id: planId, gymId: gym.id } })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const exercise = await prisma.planExercise.create({
    data: {
      planId: plan.id,
      name:   name,
      sets:   sets || 3,
      reps:   reps || '10-12',
      rest:   rest ?? 60,
      day:    day  || 1,
      notes:  notes || null,
    },
  })

  return NextResponse.json(exercise)
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Exercise id is required' }, { status: 400 })

  const exercise = await prisma.planExercise.findFirst({
    where: { id, plan: { gymId: gym.id } },
  })
  if (!exercise) return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })

  await prisma.planExercise.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
