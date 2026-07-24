import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin } from '@/lib/getGym'

const listQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).optional().default(1),
  limit:    z.coerce.number().int().min(1).max(100).optional().default(25),
  status:   z.string().trim().max(30).optional(),
  search:   z.string().trim().max(100).optional(),
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
})

const createPaymentSchema = z.object({
  memberId:    z.coerce.number().int().optional().nullable(),
  amount:      z.coerce.number().min(0.01, 'Amount must be greater than 0').max(1000000),
  currency:    z.string().trim().max(10).optional(),
  type:        z.enum(['MEMBERSHIP', 'CLASS', 'PERSONAL_TRAINING', 'PRODUCT']),
  status:      z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  method:      z.enum(['CARD', 'CASH', 'BANK_TRANSFER']).optional().nullable(),
  description: z.string().trim().max(300).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const { searchParams } = new URL(req.url)
  const parsed = listQuerySchema.safeParse({
    page: searchParams.get('page') || undefined,
    limit: searchParams.get('limit') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { page, limit, status, search, dateFrom, dateTo } = parsed.data

  const dateFilter: any = {}
  if (dateFrom) {
    const d = new Date(dateFrom)
    if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid dateFrom' }, { status: 400 })
    dateFilter.gte = d
  }
  if (dateTo) {
    const d = new Date(dateTo)
    if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid dateTo' }, { status: 400 })
    d.setHours(23, 59, 59, 999)
    dateFilter.lte = d
  }

  const where: any = {
    gymId: gym.id,
    ...(status && status !== 'ALL' ? { status } : {}),
    ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
    ...(search ? { member: { OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }] } } : {}),
  }

  const total = await prisma.payment.count({ where })
  const payments = await prisma.payment.findMany({
    where,
    select: {
      id: true, amount: true, originalAmount: true, discountType: true, discountValue: true,
      type: true, status: true, method: true, createdAt: true,
      member: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  // Stats reflect the whole gym, independent of the current filter/page, so the KPI cards stay stable.
  const revenueAgg = await prisma.payment.aggregate({ where: { gymId: gym.id, status: 'COMPLETED' }, _sum: { amount: true } })
  const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0, 0, 0, 0)
  const monthAgg = await prisma.payment.aggregate({ where: { gymId: gym.id, status: 'COMPLETED', createdAt: { gte: thisMonthStart } }, _sum: { amount: true } })
  const pendingAgg = await prisma.payment.aggregate({ where: { gymId: gym.id, status: 'PENDING' }, _sum: { amount: true }, _count: true })

  return NextResponse.json({
    payments,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    stats: {
      totalRevenue: revenueAgg._sum.amount || 0,
      thisMonth: monthAgg._sum.amount || 0,
      pendingCount: pendingAgg._count || 0,
      pendingAmount: pendingAgg._sum.amount || 0,
    },
  })
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result

  const parsed = createPaymentSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = parsed.data

  if (body.memberId) {
    const member = await prisma.member.findFirst({ where: { id: body.memberId, gymId: gym.id } })
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const status = body.status || 'COMPLETED'
  const payment = await prisma.payment.create({
    data: {
      gymId:       gym.id,
      memberId:    body.memberId || null,
      amount:      body.amount,
      currency:    body.currency || gym.currency || 'USD',
      type:        body.type,
      status,
      method:      body.method || 'CASH',
      description: body.description || null,
      paidAt:      status === 'COMPLETED' ? new Date() : null,
    },
    include: { member: { select: { id: true, firstName: true, lastName: true } } },
  })
  return NextResponse.json(payment)
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym, session } = result
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const payment = await prisma.payment.findFirst({ where: { id, gymId: gym.id } })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  await prisma.payment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
