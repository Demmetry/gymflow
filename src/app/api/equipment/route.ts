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
  const equipment = await prisma.equipment.findMany({
    where: { gymId: gym.id },
    orderBy: { nextMaintenance: 'asc' },
  })
  return NextResponse.json(equipment)
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  try {
    const body = await req.json()
    const item = await prisma.equipment.create({
      data: {
        gymId:           gym.id,
        name:            body.name,
        category:        body.category     || null,
        brand:           body.brand        || null,
        serialNumber:    body.serialNumber || null,
        status:          body.status       || 'OPERATIONAL',
        notes:           body.notes        || null,
        purchaseDate:    toDate(body.purchaseDate),
        lastMaintenance: toDate(body.lastMaintenance),
        nextMaintenance: toDate(body.nextMaintenance),
      },
    })
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
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  try {
    const body = await req.json()
    const data: any = { ...body }
    if ('purchaseDate'    in body) data.purchaseDate    = toDate(body.purchaseDate)
    if ('lastMaintenance' in body) data.lastMaintenance = toDate(body.lastMaintenance)
    if ('nextMaintenance' in body) data.nextMaintenance = toDate(body.nextMaintenance)
    await prisma.equipment.updateMany({ where: { id, gymId: gym.id }, data })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Equipment update error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to update equipment' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.equipment.deleteMany({ where: { id, gymId: gym.id } })
  return NextResponse.json({ success: true })
}
