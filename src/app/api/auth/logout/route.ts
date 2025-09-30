import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth-mysql'

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value

    if (token) {
      // Sign out (this could blacklist the token in a more secure implementation)
      await AuthService.signOut(token)
    }

    // Create response
    const response = NextResponse.json({
      message: 'Logged out successfully'
    })

    // Clear the auth cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

