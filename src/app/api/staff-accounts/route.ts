import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin } from '@/lib/getGym'

const createStaffAccountSchema = z.object({
  name:     z.string().trim().min(1, 'Name is required').max(100),
  email:    z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
})

// GET: list all receptionist accounts for this gym
export async function GET() {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  if (!isAdmin(result.session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { gym } = result
  const accounts = await prisma.user.findMany({
    where: { staffGymId: gym.id, role: 'RECEPTIONIST' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(accounts)
}

// POST: create a receptionist account
export async function POST(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  if (!isAdmin(result.session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { gym } = result
  const parsed = createStaffAccountSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { name, email: normalizedEmail, password } = parsed.data
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (exists) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  const hashed = await bcrypt.hash(password, 12)
  const account = await prisma.user.create({
    data: { name, email: normalizedEmail, password: hashed, role: 'RECEPTIONIST', staffGymId: gym.id },
  })
  return NextResponse.json({ id: account.id, name: account.name, email: account.email, role: account.role })
}

// DELETE: remove a receptionist account
export async function DELETE(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  if (!isAdmin(result.session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { gym } = result
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  // Ensure the account belongs to this gym
  const account = await prisma.user.findFirst({ where: { id, staffGymId: gym.id, role: 'RECEPTIONIST' } })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
