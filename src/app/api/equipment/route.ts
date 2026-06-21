import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin } from '@/lib/getGym'
import { sanitizeDates } from '@/lib/utils'


export async function GET() {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const equipment = await prisma.equipment.findMany({ where: { gymId: gym.id }, orderBy: { nextMaintenance: 'asc' } })
  return NextResponse.json(equipment)
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  try {
    const body = await req.json()
    const clean = sanitizeDates(body, ['purchaseDate', 'lastMaintenance', 'nextMaintenance'])
    const item = await prisma.equipment.create({ data: { ...clean, gymId: gym.id } })
    return NextResponse.json(item)
  } catch (err: any) {
    console.error('Equipment create error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to create equipment' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  try {
    const body = await req.json()
    const clean = sanitizeDates(body, ['purchaseDate', 'lastMaintenance', 'nextMaintenance'])
    const item = await prisma.equipment.updateMany({ where: { id, gymId: gym.id }, data: clean })
    return NextResponse.json(item)
  } catch (err: any) {
    console.error('Equipment update error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to update equipment' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.equipment.deleteMany({ where: { id, gymId: gym.id } })
  return NextResponse.json({ success: true })
}
