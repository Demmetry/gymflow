import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin } from '@/lib/getGym'


export async function GET(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // 'staff' | 'payroll'
  if (type === 'payroll') {
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
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
    delete body._type
    const staff = await prisma.staff.create({ data: { ...body, gymId: gym.id } })
    return NextResponse.json(staff)
  }
  if (body._type === 'payroll') {
    delete body._type
    const total = (body.baseSalary || 0) + (body.commission || 0) + (body.bonus || 0) - (body.deductions || 0)
    const run = await prisma.payrollRun.create({ data: { ...body, total, gymId: gym.id } })
    return NextResponse.json(run)
  }
  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const body = await req.json()
  if (body._type === 'markPaid') {
    await prisma.payrollRun.updateMany({ where: { id, gymId: gym.id }, data: { status: 'PAID', paidAt: new Date() } })
    return NextResponse.json({ success: true })
  }
  await prisma.staff.updateMany({ where: { id, gymId: gym.id }, data: body })
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
