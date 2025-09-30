import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth-mysql'
import { DatabaseService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await AuthService.getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { title, description } = await request.json()

    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Create grading session
    const result = await DatabaseService.createGradingSession(
      user.id,
      title.trim(),
      description?.trim() || null
    )

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      session: result.data,
      message: 'Grading session created successfully'
    })

  } catch (error) {
    console.error('Create grading session API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await AuthService.getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get all grading sessions for the user
    const result = await DatabaseService.getGradingSessionsByTeacher(user.id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sessions: result.data
    })

  } catch (error) {
    console.error('Get grading sessions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
