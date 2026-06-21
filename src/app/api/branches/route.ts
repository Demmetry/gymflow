import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin } from '@/lib/getGym'


export async function GET() {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const branches = await prisma.branch.findMany({ where: { gymId: gym.id }, orderBy: { createdAt: 'asc' } })
  // Get member/revenue counts per branch (simplified - in production link members to branches)
  const memberCount = await prisma.member.count({ where: { gymId: gym.id, membershipStatus: 'ACTIVE' } })
  const revenue = await prisma.payment.aggregate({ where: { gymId: gym.id, status:'COMPLETED' }, _sum: { amount: true } })
  return NextResponse.json({ branches, gymStats: { memberCount, totalRevenue: revenue._sum.amount || 0 } })
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const body = await req.json()
  const branch = await prisma.branch.create({ data: { ...body, gymId: gym.id } })
  return NextResponse.json(branch)
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const body = await req.json()
  await prisma.branch.updateMany({ where: { id, gymId: gym.id }, data: body })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.branch.deleteMany({ where: { id, gymId: gym.id } })
  return NextResponse.json({ success: true })
}
