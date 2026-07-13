import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

function toDate(val: unknown): Date | null {
  if (!val || val === '') return null
  const d = new Date(val as string)
  return isNaN(d.getTime()) ? null : d
}

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
    const body = await req.json()
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
        duration:    Number(body.duration)  || 60,
        capacity:    Number(body.capacity)  || 20,
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
