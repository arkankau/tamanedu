import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromImage, processOCRResults } from '@/lib/ocr'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }
    
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
        // Extract text using OCR
        const ocrResults = await extractTextFromImage(file)
        
        // Process results to extract structured answers
        const extractedAnswers = processOCRResults(ocrResults, i + 1)
        
        results.push({
          filename: file.name,
          pageNumber: i + 1,
          answers: extractedAnswers,
          rawOCR: ocrResults
        })
        
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error)
        results.push({
          filename: file.name,
          pageNumber: i + 1,
          error: `Failed to process ${file.name}`,
          answers: [],
          rawOCR: []
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    })
    
  } catch (error) {
    console.error('OCR API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

