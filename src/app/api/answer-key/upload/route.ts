import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/supabase'
import { parseAcceptedVariants } from '@/lib/utils'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    // Validate file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      )
    }
    
    // Read and parse CSV
    const csvText = await file.text()
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim()
    })
    
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid CSV format', details: parseResult.errors },
        { status: 400 }
      )
    }
    
    const data = parseResult.data as Array<{
      question?: string
      'question number'?: string
      'question_number'?: string
      answer?: string
      'correct answer'?: string
      'correct_answer'?: string
      points?: string
    }>
    
    // Validate required columns
    if (data.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      )
    }
    
    // Process answer key data
    const answerKeys = []
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      // Extract question number
      const questionNumber = 
        row.question || 
        row['question number'] || 
        row['question_number'] || 
        (i + 1).toString()
      
      // Extract answer
      const answerText = 
        row.answer || 
        row['correct answer'] || 
        row['correct_answer']
      
      // Extract points (default to 1)
      const points = row.points ? parseFloat(row.points) : 1.0
      
      if (!answerText) {
        return NextResponse.json(
          { error: `Missing answer for question ${questionNumber}` },
          { status: 400 }
        )
      }
      
      // Parse accepted variants
      const { correctAnswer, acceptedVariants } = parseAcceptedVariants(answerText)
      
      answerKeys.push({
        session_id: sessionId,
        question_number: parseInt(questionNumber.toString()),
        correct_answer: correctAnswer,
        accepted_variants: acceptedVariants,
        points: points
      })
    }
    
    // Delete existing answer keys for this session
    const deleteResult = await DatabaseService.deleteAnswerKeysBySession(sessionId)
    
    if (deleteResult.error) {
      console.error('Error deleting existing answer keys:', deleteResult.error)
      return NextResponse.json(
        { error: 'Failed to update answer keys' },
        { status: 500 }
      )
    }
    
    // Insert new answer keys
    const insertResult = await DatabaseService.createAnswerKeys(answerKeys)
    
    if (insertResult.error) {
      console.error('Error inserting answer keys:', insertResult.error)
      return NextResponse.json(
        { error: 'Failed to save answer keys' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      answerKeys: insertResult.data,
      count: insertResult.data?.length || 0
    })
    
  } catch (error) {
    console.error('Answer key upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

