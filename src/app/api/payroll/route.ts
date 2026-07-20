import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

const createStaffSchema = z.object({
  _type:      z.literal('staff'),
  firstName:  z.string().trim().min(1, 'First name is required').max(100),
  lastName:   z.string().trim().min(1, 'Last name is required').max(100),
  email:      z.string().trim().email('Invalid email'),
  phone:      z.string().trim().max(30).optional().nullable(),
  role:       z.string().trim().max(30).optional(),
  salary:     z.coerce.number().min(0).optional(),
  salaryType: z.string().trim().max(20).optional(),
})

const createPayrollSchema = z.object({
  _type:       z.literal('payroll'),
  staffId:     z.string().min(1),
  month:       z.coerce.number().int().min(1).max(12),
  year:        z.coerce.number().int().min(2020).max(2100),
  baseSalary:  z.coerce.number().min(0).optional(),
  commission:  z.coerce.number().min(0).optional(),
  bonus:       z.coerce.number().min(0).optional(),
  deductions:  z.coerce.number().min(0).optional(),
  notes:       z.string().trim().max(500).optional().nullable(),
})

const updateStaffSchema = z.object({
  _type:      z.string().optional(),
  firstName:  z.string().trim().min(1).max(100).optional(),
  lastName:   z.string().trim().min(1).max(100).optional(),
  email:      z.string().trim().email().optional(),
  role:       z.string().trim().max(30).optional(),
  salary:     z.coerce.number().min(0).optional(),
  salaryType: z.string().trim().max(20).optional(),
  isActive:   z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  if (type === 'payroll') {
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()))
    const runs = await prisma.payrollRun.findMany({
      where: { gymId: gym.id, month, year },
      include: { staff: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(runs)
  }

  const staff = await prisma.staff.findMany({ where: { gymId: gym.id }, orderBy: { firstName: 'asc' } })
  return NextResponse.json(staff)
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const rawBody = await req.json()

  if (rawBody._type === 'staff') {
    const parsed = createStaffSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const body = parsed.data
    try {
      const staff = await prisma.staff.create({
        data: {
          gymId:      gym.id,
          firstName:  body.firstName,
          lastName:   body.lastName,
          email:      body.email,
          phone:      body.phone      || null,
          role:       body.role       || 'STAFF',
          salary:     body.salary     || 0,
          salaryType: body.salaryType || 'MONTHLY',
        },
      })
      return NextResponse.json(staff)
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to add staff' }, { status: 500 })
    }
  }

  if (rawBody._type === 'payroll') {
    const parsed = createPayrollSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const body = parsed.data
    try {
      const baseSalary  = body.baseSalary  || 0
      const commission  = body.commission  || 0
      const bonus       = body.bonus       || 0
      const deductions  = body.deductions  || 0
      const total       = baseSalary + commission + bonus - deductions

      const run = await prisma.payrollRun.create({
        data: {
          gymId:      gym.id,
          staffId:    body.staffId,
          month:      body.month,
          year:       body.year,
          baseSalary,
          commission,
          bonus,
          deductions,
          total,
          status:     'PENDING',
          notes:      body.notes || null,
        },
      })
      return NextResponse.json(run)
    } catch (err: any) {
      if (err.code === 'P2002') return NextResponse.json({ error: 'Payroll already exists for this staff member this month' }, { status: 409 })
      return NextResponse.json({ error: err?.message || 'Failed to create payroll' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id   = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const rawBody = await req.json()

  if (rawBody._type === 'markPaid') {
    await prisma.payrollRun.updateMany({ where: { id, gymId: gym.id }, data: { status: 'PAID', paidAt: new Date() } })
    return NextResponse.json({ success: true })
  }

  const parsed = updateStaffSchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const body = parsed.data

  const updateData: any = {}
  if (body.firstName  !== undefined) updateData.firstName  = body.firstName
  if (body.lastName   !== undefined) updateData.lastName   = body.lastName
  if (body.email      !== undefined) updateData.email      = body.email
  if (body.role       !== undefined) updateData.role       = body.role
  if (body.salary     !== undefined) updateData.salary     = body.salary
  if (body.salaryType !== undefined) updateData.salaryType = body.salaryType
  if (body.isActive   !== undefined) updateData.isActive   = body.isActive

  await prisma.staff.updateMany({ where: { id, gymId: gym.id }, data: updateData })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  const type = new URL(req.url).searchParams.get('type')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (type === 'payroll') await prisma.payrollRun.deleteMany({ where: { id, gymId: gym.id } })
  else await prisma.staff.deleteMany({ where: { id, gymId: gym.id } })
  return NextResponse.json({ success: true })
}
