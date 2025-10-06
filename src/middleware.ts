import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Protected routes that require authentication
  const protectedPaths = ['/grading', '/dashboard']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // Check for auth token in cookies
  const token = request.cookies.get('auth-token')?.value

  // Redirect to login if accessing protected route without authentication
  if (isProtectedPath && !token) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return Response.redirect(redirectUrl)
  }

  // For now, skip redirecting from auth pages to dashboard when database is not available
  // This prevents redirect loops when MySQL is not installed
  // if (request.nextUrl.pathname.startsWith('/auth') && token) {
  //   return Response.redirect(new URL('/dashboard', request.url))
  // }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
