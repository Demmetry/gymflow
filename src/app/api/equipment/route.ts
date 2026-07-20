import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

function toDate(val: unknown): Date | null {
  if (!val || val === '') return null
  const d = new Date(val as string)
  return isNaN(d.getTime()) ? null : d
}

const createEquipmentSchema = z.object({
  name:            z.string().trim().min(1, 'Name is required').max(100),
  category:        z.string().trim().max(50).optional().nullable(),
  brand:           z.string().trim().max(50).optional().nullable(),
  serialNumber:    z.string().trim().max(100).optional().nullable(),
  status:          z.string().trim().max(30).optional(),
  notes:           z.string().trim().max(1000).optional().nullable(),
  purchaseDate:    z.string().optional().nullable(),
  lastMaintenance: z.string().optional().nullable(),
  nextMaintenance: z.string().optional().nullable(),
})

const updateEquipmentSchema = z.object({
  name:            z.string().trim().min(1).max(100).optional(),
  category:        z.string().trim().max(50).optional().nullable(),
  brand:           z.string().trim().max(50).optional().nullable(),
  serialNumber:    z.string().trim().max(100).optional().nullable(),
  status:          z.string().trim().max(30).optional(),
  notes:           z.string().trim().max(1000).optional().nullable(),
  purchaseDate:    z.string().optional().nullable(),
  lastMaintenance: z.string().optional().nullable(),
  nextMaintenance: z.string().optional().nullable(),
})

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
    const parsed = createEquipmentSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const body = parsed.data
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
    const parsed = updateEquipmentSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const body = parsed.data
    const data: any = {}
    if (body.name            !== undefined) data.name            = body.name
    if (body.category        !== undefined) data.category        = body.category
    if (body.brand           !== undefined) data.brand           = body.brand
    if (body.serialNumber    !== undefined) data.serialNumber    = body.serialNumber
    if (body.status          !== undefined) data.status          = body.status
    if (body.notes           !== undefined) data.notes           = body.notes
    if (body.purchaseDate    !== undefined) data.purchaseDate    = toDate(body.purchaseDate)
    if (body.lastMaintenance !== undefined) data.lastMaintenance = toDate(body.lastMaintenance)
    if (body.nextMaintenance !== undefined) data.nextMaintenance = toDate(body.nextMaintenance)
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
