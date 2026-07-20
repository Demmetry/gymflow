import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

function toDate(val: unknown): Date | null {
  if (!val || val === '') return null
  const d = new Date(val as string)
  return isNaN(d.getTime()) ? null : d
}

const createLeadSchema = z.object({
  firstName:  z.string().trim().min(1, 'First name is required').max(100),
  lastName:   z.string().trim().min(1, 'Last name is required').max(100),
  email:      z.string().trim().email().optional().nullable().or(z.literal('')),
  phone:      z.string().trim().max(30).optional().nullable(),
  source:     z.string().trim().max(30).optional(),
  status:     z.string().trim().max(30).optional(),
  assignedTo: z.string().trim().max(100).optional().nullable(),
  notes:      z.string().trim().max(2000).optional().nullable(),
  trialStart:  z.string().optional().nullable(),
  trialEnd:    z.string().optional().nullable(),
  followUpAt:  z.string().optional().nullable(),
  convertedAt: z.string().optional().nullable(),
})

const updateLeadSchema = z.object({
  firstName:  z.string().trim().min(1).max(100).optional(),
  lastName:   z.string().trim().min(1).max(100).optional(),
  email:      z.string().trim().email().optional().nullable().or(z.literal('')),
  phone:      z.string().trim().max(30).optional().nullable(),
  source:     z.string().trim().max(30).optional(),
  status:     z.string().trim().max(30).optional(),
  assignedTo: z.string().trim().max(100).optional().nullable(),
  notes:      z.string().trim().max(2000).optional().nullable(),
  trialStart:  z.string().optional().nullable(),
  trialEnd:    z.string().optional().nullable(),
  followUpAt:  z.string().optional().nullable(),
  convertedAt: z.string().optional().nullable(),
  interactionNote: z.string().trim().max(1000).optional(),
  interactionType: z.string().trim().max(30).optional(),
})

export async function GET(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const leads = await prisma.lead.findMany({
    where: {
      gymId: gym.id,
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(search ? { OR: [
        { firstName: { contains: search } },
        { lastName:  { contains: search } },
        { phone:     { contains: search } },
      ]} : {}),
    },
    include: { interactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  })

  const total        = leads.length
  const converted    = leads.filter(l => l.status === 'CONVERTED').length
  const trials       = leads.filter(l => l.status === 'TRIAL').length
  const newLeads     = leads.filter(l => l.status === 'NEW').length
  const followUpsDue = leads.filter(l =>
    l.followUpAt && new Date(l.followUpAt) <= new Date() && !['CONVERTED','LOST'].includes(l.status)
  ).length

  return NextResponse.json({
    leads,
    stats: { total, converted, trials, newLeads, followUpsDue, conversionRate: total > 0 ? Math.round((converted/total)*100) : 0 },
  })
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  try {
    const parsed = createLeadSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const body = parsed.data
    const lead = await prisma.lead.create({
      data: {
        gymId:      gym.id,
        firstName:  body.firstName,
        lastName:   body.lastName,
        email:      body.email      || null,
        phone:      body.phone      || null,
        source:     body.source     || 'WALK_IN',
        status:     body.status     || 'NEW',
        assignedTo: body.assignedTo || null,
        notes:      body.notes      || null,
        trialStart:  toDate(body.trialStart),
        trialEnd:    toDate(body.trialEnd),
        followUpAt:  toDate(body.followUpAt),
        convertedAt: toDate(body.convertedAt),
      },
    })
    return NextResponse.json(lead)
  } catch (err: any) {
    console.error('Lead create error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to create lead' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  try {
    const parsed = updateLeadSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const body = parsed.data

    if (body.interactionNote) {
      await prisma.leadInteraction.create({
        data: { leadId: id, type: body.interactionType || 'NOTE', note: body.interactionNote },
      })
    }

    const updateData: any = {}
    if (body.firstName  !== undefined) updateData.firstName  = body.firstName
    if (body.lastName   !== undefined) updateData.lastName   = body.lastName
    if (body.email      !== undefined) updateData.email      = body.email
    if (body.phone      !== undefined) updateData.phone      = body.phone
    if (body.source     !== undefined) updateData.source     = body.source
    if (body.status     !== undefined) updateData.status     = body.status
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo
    if (body.notes      !== undefined) updateData.notes      = body.notes
    if (body.trialStart  !== undefined) updateData.trialStart  = toDate(body.trialStart)
    if (body.trialEnd    !== undefined) updateData.trialEnd    = toDate(body.trialEnd)
    if (body.followUpAt  !== undefined) updateData.followUpAt  = toDate(body.followUpAt)
    if (body.convertedAt !== undefined) updateData.convertedAt = toDate(body.convertedAt)

    if (Object.keys(updateData).length > 0) {
      await prisma.lead.updateMany({ where: { id, gymId: gym.id }, data: updateData })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Lead update error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.lead.deleteMany({ where: { id, gymId: gym.id } })
  return NextResponse.json({ success: true })
}
