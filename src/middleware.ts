import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any
    if (req.nextUrl.pathname.startsWith('/admin') && !token?.isPlatformOwner) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  },
  {
    callbacks: {
      // Just needs a valid session here — the /admin-specific check happens above,
      // since this callback only controls whether to redirect to the sign-in page at all.
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
