import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

function toDate(val: unknown): Date | null {
  if (!val || val === '') return null
  const d = new Date(val as string)
  return isNaN(d.getTime()) ? null : d
}

const createClassSchema = z.object({
  name:        z.string().trim().min(1, 'Name is required').max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  category:    z.string().trim().max(50).optional().nullable(),
  duration:    z.coerce.number().int().min(1).max(600).optional(),
  capacity:    z.coerce.number().int().min(1).max(500).optional(),
  color:       z.string().trim().max(20).optional(),
  location:    z.string().trim().max(100).optional().nullable(),
  trainerId:   z.string().optional().nullable(),
  startTime:   z.string().min(1, 'Start time is required'),
  endTime:     z.string().min(1, 'End time is required'),
})

export async function GET() {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const classes = await prisma.gymClass.findMany({
    where: { gymId: gym.id },
    include: { trainer: true },
    orderBy: { startTime: 'asc' },
  })
  return NextResponse.json(classes)
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  try {
    const parsed = createClassSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const body = parsed.data
    const startTime = toDate(body.startTime)
    const endTime   = toDate(body.endTime)
    if (!startTime) return NextResponse.json({ error: 'Valid start time is required' }, { status: 400 })
    if (!endTime)   return NextResponse.json({ error: 'Valid end time is required'   }, { status: 400 })
    const cls = await prisma.gymClass.create({
      data: {
        gymId:       gym.id,
        name:        body.name,
        description: body.description || null,
        category:    body.category    || null,
        duration:    body.duration    || 60,
        capacity:    body.capacity    || 20,
        color:       body.color       || '#b5ff47',
        location:    body.location    || null,
        trainerId:   body.trainerId   || null,
        startTime,
        endTime,
      },
    })
    return NextResponse.json(cls)
  } catch (err: any) {
    console.error('Class create error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to create class' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Class ID required' }, { status: 400 })
  const cls = await prisma.gymClass.findFirst({ where: { id, gymId: gym.id } })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  await prisma.gymClass.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
