import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionAndGym, isAdmin, ALL_PERMISSION_KEYS } from '@/lib/getGym'

const permissionsSchema = z.array(z.enum(ALL_PERMISSION_KEYS as [string, ...string[]])).optional()

const createStaffAccountSchema = z.object({
  name:        z.string().trim().min(1, 'Name is required').max(100),
  email:       z.string().trim().toLowerCase().email('Invalid email address'),
  password:    z.string().min(8, 'Password must be at least 8 characters').max(200),
  branchId:    z.string().optional().nullable(),
  permissions: permissionsSchema,
})

const updateStaffAccountSchema = z.object({
  branchId:    z.string().optional().nullable(),
  permissions: permissionsSchema,
})

// GET: list all receptionist accounts for this gym
export async function GET() {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  if (!isAdmin(result.session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { gym } = result
  const accounts = await prisma.user.findMany({
    where: { staffGymId: gym.id, role: 'RECEPTIONIST' },
    select: { id: true, name: true, email: true, role: true, branchId: true, permissions: true, createdAt: true },
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
  const { name, email: normalizedEmail, password, branchId, permissions } = parsed.data

  if (branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: branchId, gymId: gym.id } })
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (exists) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  const hashed = await bcrypt.hash(password, 12)
  const account = await prisma.user.create({
    data: {
      name, email: normalizedEmail, password: hashed, role: 'RECEPTIONIST', staffGymId: gym.id,
      branchId: branchId || null,
      permissions: permissions ? JSON.stringify(permissions) : null,
    },
  })
  return NextResponse.json({ id: account.id, name: account.name, email: account.email, role: account.role, branchId: account.branchId, permissions: account.permissions })
}

// PATCH: update an existing receptionist's branch/permissions
export async function PATCH(req: NextRequest) {
  const result = await getSessionAndGym()
  if ('error' in result) return result.error
  if (!isAdmin(result.session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { gym } = result

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const account = await prisma.user.findFirst({ where: { id, staffGymId: gym.id, role: 'RECEPTIONIST' } })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const parsed = updateStaffAccountSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { branchId, permissions } = parsed.data

  if (branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: branchId, gymId: gym.id } })
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  const data: any = {}
  if (branchId !== undefined) data.branchId = branchId || null
  if (permissions !== undefined) data.permissions = permissions ? JSON.stringify(permissions) : null

  const updated = await prisma.user.update({ where: { id }, data })
  return NextResponse.json({ id: updated.id, branchId: updated.branchId, permissions: updated.permissions })
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
