import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin } from '@/lib/getGym'


export async function GET(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  if (type === 'sales') {
    const sales = await prisma.storeSale.findMany({
      where: { gymId: gym.id },
      include: { item: true },
      orderBy: { soldAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(sales)
  }
  const items = await prisma.inventoryItem.findMany({ where: { gymId: gym.id, isActive: true }, orderBy: { name: 'asc' } })
  const lowStock = items.filter(i => i.stock <= i.lowStockAt)
  const totalValue = items.reduce((s,i) => s + (i.stock * i.costPrice), 0)
  const todaySales = await prisma.storeSale.aggregate({
    where: { gymId: gym.id, soldAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
    _sum: { total: true }, _count: true,
  })
  return NextResponse.json({ items, stats: { lowStockCount: lowStock.length, totalValue, todayRevenue: todaySales._sum.total||0, todaySales: todaySales._count } })
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const body = await req.json()
  if (body._type === 'sale') {
    delete body._type
    const item = await prisma.inventoryItem.findFirst({ where: { id: body.itemId, gymId: gym.id } })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    if (item.stock < body.quantity) return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
    const sale = await prisma.storeSale.create({ data: { ...body, gymId: gym.id, total: item.sellPrice * body.quantity, unitPrice: item.sellPrice } })
    await prisma.inventoryItem.update({ where: { id: body.itemId }, data: { stock: { decrement: body.quantity } } })
    return NextResponse.json(sale)
  }
  const item = await prisma.inventoryItem.create({ data: { ...body, gymId: gym.id } })
  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const body = await req.json()
  await prisma.inventoryItem.updateMany({ where: { id, gymId: gym.id }, data: body })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.inventoryItem.deleteMany({ where: { id, gymId: gym.id } })
  return NextResponse.json({ success: true })
}
