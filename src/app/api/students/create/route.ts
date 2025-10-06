import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { students } = await request.json()

    if (!students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: 'Invalid students data' },
        { status: 400 }
      )
    }

    const result = await DatabaseService.createStudents(students)

    if (result.error) {
      console.error('Error creating students:', result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data?.length || 0
    })

  } catch (error: any) {
    console.error('Students creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
