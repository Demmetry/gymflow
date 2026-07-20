import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const registerSchema = z.object({
  name:     z.string().trim().min(1, 'Name is required').max(100),
  email:    z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  gymName:  z.string().trim().min(1, 'Gym name is required').max(100),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rateLimit = await checkRateLimit(`register:${ip}`)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { name, email: normalizedEmail, password, gymName } = parsed.data

    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (exists) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { name, email: normalizedEmail, password: hashed, role: 'ADMIN' } })
    let slug = slugify(gymName)
    const slugExists = await prisma.gym.findUnique({ where: { slug } })
    if (slugExists) slug = `${slug}-${Date.now()}`
    await prisma.gym.create({ data: { name: gymName, slug, ownerId: user.id, plan: 'STARTER' } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}

