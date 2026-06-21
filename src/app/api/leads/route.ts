import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin } from '@/lib/getGym'
import { sanitizeDates } from '@/lib/utils'


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
      ...(search ? { OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }, { phone: { contains: search } }] } : {}),
    },
    include: { interactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  })
  const total = leads.length
  const converted = leads.filter(l => l.status === 'CONVERTED').length
  const trials = leads.filter(l => l.status === 'TRIAL').length
  const newLeads = leads.filter(l => l.status === 'NEW').length
  const followUpsDue = leads.filter(l => l.followUpAt && new Date(l.followUpAt) <= new Date() && !['CONVERTED','LOST'].includes(l.status)).length
  return NextResponse.json({ leads, stats: { total, converted, trials, newLeads, followUpsDue, conversionRate: total > 0 ? Math.round((converted/total)*100) : 0 } })
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  try {
    const body = await req.json()
    const clean = sanitizeDates(body, ['trialStart', 'trialEnd', 'followUpAt', 'convertedAt'])
    const lead = await prisma.lead.create({ data: { ...clean, gymId: gym.id } })
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
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  try {
    const body = await req.json()
    if (body.interactionNote) {
      await prisma.leadInteraction.create({ data: { leadId: id, type: body.interactionType || 'NOTE', note: body.interactionNote } })
      delete body.interactionNote; delete body.interactionType
    }
    const clean = sanitizeDates(body, ['trialStart', 'trialEnd', 'followUpAt', 'convertedAt'])
    if (Object.keys(clean).length > 0) await prisma.lead.updateMany({ where: { id, gymId: gym.id }, data: clean })
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
