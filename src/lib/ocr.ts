import Tesseract from 'tesseract.js'
import { normalizeText, shouldFlagAnswer } from './utils'

export interface OCRResult {
  text: string
  confidence: number
  bbox?: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

export interface ExtractedAnswer {
  questionNumber: number
  rawAnswer: string
  normalizedAnswer: string
  confidence: number
  isFlagged: boolean
  pageNumber?: number
}

/**
 * Extract text from image using Tesseract.js
 */
export async function extractTextFromImage(
  imageFile: File | string,
  onProgress?: (progress: number) => void
): Promise<OCRResult[]> {
  try {
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress * 100)
        }
      }
    })

    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!?-+*/=()[]{}',
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    })

    const { data } = await worker.recognize(imageFile)
    await worker.terminate()

    // Extract words with their confidence and bounding boxes
    const results: OCRResult[] = data.words
      .filter(word => word.text.trim().length > 0)
      .map(word => ({
        text: word.text,
        confidence: word.confidence / 100, // Convert to 0-1 scale
        bbox: word.bbox ? {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1
        } : undefined
      }))

    return results
  } catch (error) {
    console.error('OCR Error:', error)
    throw new Error('Failed to extract text from image')
  }
}

/**
 * Process OCR results to extract structured answers
 * This is a simplified version - in production, you'd want more sophisticated
 * answer detection based on worksheet layout
 */
export function processOCRResults(
  ocrResults: OCRResult[],
  pageNumber: number = 1
): ExtractedAnswer[] {
  const answers: ExtractedAnswer[] = []
  
  // Simple pattern matching for numbered questions
  // This assumes answers follow patterns like "1. answer", "2) answer", etc.
  const questionPattern = /^(\d+)[\.\)\:]?\s*(.+)$/
  
  let currentQuestion = 0
  
  for (let i = 0; i < ocrResults.length; i++) {
    const result = ocrResults[i]
    const text = result.text.trim()
    
    // Try to match question number pattern
    const match = text.match(questionPattern)
    if (match) {
      const questionNum = parseInt(match[1])
      const answerText = match[2].trim()
      
      if (questionNum > currentQuestion && answerText.length > 0) {
        currentQuestion = questionNum
        
        answers.push({
          questionNumber: questionNum,
          rawAnswer: answerText,
          normalizedAnswer: normalizeText(answerText),
          confidence: result.confidence,
          isFlagged: shouldFlagAnswer(result.confidence),
          pageNumber
        })
      }
    } else {
      // If no question number found, try to group consecutive words as answers
      // This is a fallback for when OCR doesn't capture question numbers well
      const words = text.split(/\s+/).filter(word => word.length > 0)
      
      if (words.length > 0 && result.confidence > 0.3) {
        // Look for potential answer patterns (letters, short phrases, numbers)
        const potentialAnswer = words.join(' ')
        
        if (potentialAnswer.length <= 50 && /^[A-Za-z0-9\s\.\,\-\+\*\/\=\(\)]+$/.test(potentialAnswer)) {
          currentQuestion++
          
          answers.push({
            questionNumber: currentQuestion,
            rawAnswer: potentialAnswer,
            normalizedAnswer: normalizeText(potentialAnswer),
            confidence: result.confidence,
            isFlagged: shouldFlagAnswer(result.confidence),
            pageNumber
          })
        }
      }
    }
  }
  
  return answers
}

/**
 * Extract answers from multiple images (for batch processing)
 */
export async function extractAnswersFromImages(
  imageFiles: File[],
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<ExtractedAnswer[]> {
  const allAnswers: ExtractedAnswer[] = []
  
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i]
    
    try {
      const ocrResults = await extractTextFromImage(file, (progress) => {
        if (onProgress) {
          onProgress(i, progress)
        }
      })
      
      const answers = processOCRResults(ocrResults, i + 1)
      allAnswers.push(...answers)
      
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      // Continue with other files even if one fails
    }
  }
  
  return allAnswers
}

/**
 * Google Vision API integration (optional, for better OCR)
 */
export async function extractTextWithGoogleVision(
  imageFile: File
): Promise<OCRResult[]> {
  if (!process.env.GOOGLE_PROJECT_ID) {
    throw new Error('Google Vision API not configured')
  }
  
  // Convert file to base64
  const base64Image = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // Remove data:image/... prefix
    }
    reader.readAsDataURL(imageFile)
  })
  
  try {
    const response = await fetch('/api/ocr/google-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image
      })
    })
    
    if (!response.ok) {
      throw new Error('Google Vision API request failed')
    }
    
    const data = await response.json()
    return data.results || []
    
  } catch (error) {
    console.error('Google Vision API Error:', error)
    throw new Error('Failed to extract text using Google Vision API')
  }
}

/**
 * Choose OCR provider based on configuration
 */
export async function extractText(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult[]> {
  const provider = process.env.OCR_PROVIDER || 'tesseract'
  
  switch (provider) {
    case 'google-vision':
      return await extractTextWithGoogleVision(imageFile)
    case 'tesseract':
    default:
      return await extractTextFromImage(imageFile, onProgress)
  }
}

