import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { generateUniqueFilename } from '@/lib/utils'

const execAsync = promisify(exec)

interface OCRResult {
  text: string
  confidence: number
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }
    
    // Generate unique filename
    const filename = generateUniqueFilename(file.name, 'ocr')
    const uploadPath = path.join(process.cwd(), 'uploads', 'temp', filename)
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(uploadPath), { recursive: true })
    
    // Save uploaded file
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(uploadPath, buffer)
    
    try {
      // Call Python OCR service
      const pythonScript = path.join(process.cwd(), 'ocr_service.py')
      const command = `python3 "${pythonScript}" --image "${uploadPath}" --output-format json`
      
      console.log('Running OCR command:', command)
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })
      
      if (stderr) {
        console.log('OCR stderr:', stderr)
      }
      
      // Parse OCR results
      let ocrResults: OCRResult[] = []
      try {
        ocrResults = JSON.parse(stdout)
      } catch (parseError) {
        console.error('Error parsing OCR results:', parseError)
        console.error('Raw stdout:', stdout)
        return NextResponse.json(
          { error: 'Failed to parse OCR results' },
          { status: 500 }
        )
      }
      
      // Clean up temp file
      try {
        await fs.unlink(uploadPath)
      } catch (unlinkError) {
        console.warn('Failed to delete temp file:', unlinkError)
      }
      
      // Format results for the frontend
      const formattedResults = ocrResults.map(result => ({
        text: result.text,
        confidence: result.confidence,
        bbox: result.bbox
      }))
      
      console.log(`OCR completed: ${formattedResults.length} text elements extracted`)
      
      return NextResponse.json({
        success: true,
        results: formattedResults,
        count: formattedResults.length
      })
      
    } catch (execError: any) {
      console.error('OCR execution error:', execError)
      
      // Clean up temp file on error
      try {
        await fs.unlink(uploadPath)
      } catch (unlinkError) {
        console.warn('Failed to delete temp file after error:', unlinkError)
      }
      
      return NextResponse.json(
        { 
          error: 'OCR processing failed', 
          details: execError.message 
        },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('OCR API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
