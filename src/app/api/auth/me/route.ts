import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth-mysql'

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified
      }
    })

  } catch (error) {
    console.error('Auth me API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

