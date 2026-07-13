import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym } from '@/lib/getGym'

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
  const body = await req.json()

  if (body._type === 'staff') {
    try {
      const staff = await prisma.staff.create({
        data: {
          gymId:      gym.id,
          firstName:  body.firstName,
          lastName:   body.lastName,
          email:      body.email,
          phone:      body.phone      || null,
          role:       body.role       || 'STAFF',
          salary:     Number(body.salary) || 0,
          salaryType: body.salaryType || 'MONTHLY',
        },
      })
      return NextResponse.json(staff)
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to add staff' }, { status: 500 })
    }
  }

  if (body._type === 'payroll') {
    try {
      const baseSalary  = Number(body.baseSalary)  || 0
      const commission  = Number(body.commission)  || 0
      const bonus       = Number(body.bonus)       || 0
      const deductions  = Number(body.deductions)  || 0
      const total       = baseSalary + commission + bonus - deductions

      const run = await prisma.payrollRun.create({
        data: {
          gymId:      gym.id,
          staffId:    body.staffId,
          month:      Number(body.month),
          year:       Number(body.year),
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
  const body = await req.json()

  if (body._type === 'markPaid') {
    await prisma.payrollRun.updateMany({ where: { id, gymId: gym.id }, data: { status: 'PAID', paidAt: new Date() } })
    return NextResponse.json({ success: true })
  }

  const updateData: any = {}
  if (body.firstName  !== undefined) updateData.firstName  = body.firstName
  if (body.lastName   !== undefined) updateData.lastName   = body.lastName
  if (body.email      !== undefined) updateData.email      = body.email
  if (body.role       !== undefined) updateData.role       = body.role
  if (body.salary     !== undefined) updateData.salary     = Number(body.salary)
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
