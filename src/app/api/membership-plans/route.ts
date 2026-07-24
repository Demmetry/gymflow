import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin } from '@/lib/getGym'

const createPlanSchema = z.object({
  name:         z.string().trim().min(1, 'Name is required').max(100),
  price:        z.coerce.number().min(0, 'Price cannot be negative').max(100000),
  durationDays: z.coerce.number().int().min(1, 'Duration must be at least 1 day').max(3650),
  description:  z.string().trim().max(500).optional().nullable(),
})

const updatePlanSchema = z.object({
  name:         z.string().trim().min(1).max(100).optional(),
  price:        z.coerce.number().min(0).max(100000).optional(),
  durationDays: z.coerce.number().int().min(1).max(3650).optional(),
  description:  z.string().trim().max(500).optional().nullable(),
  isActive:     z.boolean().optional(),
})

export async function GET() {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const plans = await prisma.membershipPlan.findMany({
    where: { gymId: gym.id },
    orderBy: { price: 'asc' },
  })
  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym, session } = result
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const parsed = createPlanSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = parsed.data

  const plan = await prisma.membershipPlan.create({
    data: {
      gymId:        gym.id,
      name:         body.name,
      price:        body.price,
      durationDays: body.durationDays,
      description:  body.description || null,
    },
  })
  return NextResponse.json(plan)
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym, session } = result
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const plan = await prisma.membershipPlan.findFirst({ where: { id, gymId: gym.id } })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const parsed = updatePlanSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = parsed.data

  const data: any = {}
  if (body.name         !== undefined) data.name         = body.name
  if (body.price        !== undefined) data.price        = body.price
  if (body.durationDays !== undefined) data.durationDays = body.durationDays
  if (body.description  !== undefined) data.description  = body.description
  if (body.isActive     !== undefined) data.isActive     = body.isActive

  const updated = await prisma.membershipPlan.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym, session } = result
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const plan = await prisma.membershipPlan.findFirst({ where: { id, gymId: gym.id } })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const inUse = await prisma.member.count({ where: { planId: id } })
  if (inUse > 0) {
    // Don't delete a plan members are actively on — deactivate instead so history stays intact
    const updated = await prisma.membershipPlan.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true, deactivated: true, plan: updated })
  }

  await prisma.membershipPlan.delete({ where: { id } })
  return NextResponse.json({ success: true, deleted: true })
}
