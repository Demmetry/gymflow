import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = forgotSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const normalizedEmail = parsed.data.email

    const rateLimit = await checkRateLimit(`forgot-password:${normalizedEmail}`)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    // Always return the same generic response whether or not the account exists,
    // so this endpoint can't be used to check which emails are registered.
    const genericResponse = NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    })

    if (!user) return genericResponse

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    })

    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'GymFlow <onboarding@resend.dev>',
      to: normalizedEmail,
      subject: 'Reset your GymFlow password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Reset your password</h2>
          <p>We received a request to reset your GymFlow password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#b5ff47;color:#111;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    })

    return genericResponse
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
