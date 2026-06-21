import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin } from '@/lib/getGym'
import { sanitizeDates } from '@/lib/utils'

export async function GET() {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const classes = await prisma.gymClass.findMany({ where: { gymId: gym.id }, include: { trainer: true }, orderBy: { startTime: 'asc' } })
  return NextResponse.json(classes)
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  try {
    const body = await req.json()
    if (!body.startTime || !body.endTime) {
      return NextResponse.json({ error: 'Start time and end time are required' }, { status: 400 })
    }
    const clean = sanitizeDates(body, ['startTime', 'endTime'])
    if (!clean.startTime || !clean.endTime) {
      return NextResponse.json({ error: 'Invalid start or end time' }, { status: 400 })
    }
    const cls = await prisma.gymClass.create({ data: { ...clean, gymId: gym.id } })
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
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Class ID required' }, { status: 400 })
  const cls = await prisma.gymClass.findFirst({ where: { id, gymId: gym.id } })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  await prisma.gymClass.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
