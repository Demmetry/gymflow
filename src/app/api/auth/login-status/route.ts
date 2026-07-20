import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRateLimitStatus } from '@/lib/rateLimit'

const schema = z.object({ email: z.string().trim().toLowerCase().email() })

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ blocked: false })

  const status = await getRateLimitStatus(`login:${parsed.data.email}`)
  return NextResponse.json(status)
}
