import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Triggered by Vercel Cron (see vercel.json). Deletes rate limit rows old enough
// that they can no longer affect any active window, so the table doesn't grow forever.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours is well past any real window
  const result = await prisma.rateLimitAttempt.deleteMany({ where: { windowStart: { lt: cutoff } } })

  return NextResponse.json({ deleted: result.count })
}
