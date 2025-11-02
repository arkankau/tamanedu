import { NextRequest, NextResponse } from 'next/server'
import { extractAnswersFromImage } from '@/lib/llm-grading'
import { DatabaseService } from '@/lib/chromadb'

/**
 * AI-based answer extraction endpoint using Reka Vision
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const sessionId = formData.get('sessionId') as string
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    // Get answer key for this session to know which questions to extract
    const answerKeysResult = await DatabaseService.getAnswerKeysBySession(sessionId)
    
    if (answerKeysResult.error || !answerKeysResult.data || answerKeysResult.data.length === 0) {
      return NextResponse.json(
        { error: 'Answer key not found. Please upload answer key first.' },
        { status: 404 }
      )
    }
    
    const questionNumbers = answerKeysResult.data.map(ak => ak.question_number)
    
    const results = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `File ${file.name} is not an image` },
          { status: 400 }
        )
      }
      
      try {
        // Extract answers using Reka AI vision
        const extractedAnswers = await extractAnswersFromImage(file, questionNumbers)
        
        results.push({
          filename: file.name,
          pageNumber: i + 1,
          answers: extractedAnswers.map(answer => ({
            questionNumber: answer.questionNumber,
            extractedAnswer: answer.extractedAnswer,
            confidence: answer.confidence,
          }))
        })
        
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error)
        results.push({
          filename: file.name,
          pageNumber: i + 1,
          error: `Failed to process ${file.name}`,
          answers: []
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    })
    
  } catch (error) {
    console.error('AI Extraction API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

