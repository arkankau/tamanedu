import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { responses } = await request.json()

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Invalid responses data' },
        { status: 400 }
      )
    }

    const result = await DatabaseService.createResponses(responses)

    if (result.error) {
      console.error('Error creating responses:', result.error)
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
    console.error('Responses creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
