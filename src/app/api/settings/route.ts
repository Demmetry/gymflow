import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin } from '@/lib/getGym'

const updateSettingsSchema = z.object({
  name:     z.string().trim().min(1).max(100).optional(),
  address:  z.string().trim().max(300).optional().nullable(),
  phone:    z.string().trim().max(30).optional().nullable(),
  email:    z.string().trim().email().optional().nullable().or(z.literal('')),
  currency: z.string().trim().max(10).optional(),
  timezone: z.string().trim().max(50).optional(),
})

export async function GET() {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  return NextResponse.json(result.gym)
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  if (!isAdmin(result.session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { gym } = result

  const parsed = updateSettingsSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = parsed.data

  const data: any = {}
  if (body.name     !== undefined) data.name     = body.name
  if (body.address  !== undefined) data.address  = body.address
  if (body.phone    !== undefined) data.phone    = body.phone
  if (body.email    !== undefined) data.email    = body.email
  if (body.currency !== undefined) data.currency = body.currency
  if (body.timezone !== undefined) data.timezone = body.timezone

  const updated = await prisma.gym.update({ where: { id: gym.id }, data })
  return NextResponse.json(updated)
}
