import { prisma } from '@/lib/prisma'

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5

/**
 * Read-only check — does NOT increment. Used to show a specific "too many attempts"
 * message before the real attempt happens, without counting the check itself as an attempt.
 */
export async function getRateLimitStatus(key: string): Promise<{ blocked: boolean; retryAfterSeconds?: number }> {
  const existing = await prisma.rateLimitAttempt.findUnique({ where: { key } })
  if (!existing) return { blocked: false }

  const windowAge = Date.now() - existing.windowStart.getTime()
  if (windowAge > WINDOW_MS) return { blocked: false }

  if (existing.count >= MAX_ATTEMPTS) {
    return { blocked: true, retryAfterSeconds: Math.ceil((WINDOW_MS - windowAge) / 1000) }
  }
  return { blocked: false }
}

/**
 * Checks and increments a rate limit counter stored in Postgres.
 * key should identify what's being limited, e.g. `login:${email}` or `register:${ip}`.
 */
export async function checkRateLimit(key: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = new Date()
  const existing = await prisma.rateLimitAttempt.findUnique({ where: { key } })

  if (!existing) {
    await prisma.rateLimitAttempt.create({ data: { key, count: 1, windowStart: now } })
    return { allowed: true }
  }

  const windowAge = now.getTime() - existing.windowStart.getTime()

  if (windowAge > WINDOW_MS) {
    await prisma.rateLimitAttempt.update({ where: { key }, data: { count: 1, windowStart: now } })
    return { allowed: true }
  }

  if (existing.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((WINDOW_MS - windowAge) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  await prisma.rateLimitAttempt.update({ where: { key }, data: { count: { increment: 1 } } })
  return { allowed: true }
}

/** Returns the caller's IP as seen by Vercel/most proxies, falling back to 'unknown'. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown'
}
