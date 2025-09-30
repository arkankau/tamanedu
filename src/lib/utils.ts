import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize text for answer comparison
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove diacritics/accents
 * - Remove extra spaces
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, '') // Remove punctuation except spaces
}

/**
 * Check if a student answer matches the correct answer or any accepted variants
 */
export function isAnswerCorrect(
  studentAnswer: string,
  correctAnswer: string,
  acceptedVariants: string[] = []
): boolean {
  const normalizedStudent = normalizeText(studentAnswer)
  const normalizedCorrect = normalizeText(correctAnswer)
  
  // Check exact match with correct answer
  if (normalizedStudent === normalizedCorrect) {
    return true
  }
  
  // Check against accepted variants
  for (const variant of acceptedVariants) {
    if (normalizedStudent === normalizeText(variant)) {
      return true
    }
  }
  
  return false
}

/**
 * Parse accepted variants from answer key CSV format
 * Supports pipe-separated variants like "answer1|answer2|answer3"
 */
export function parseAcceptedVariants(answerText: string): {
  correctAnswer: string
  acceptedVariants: string[]
} {
  const variants = answerText.split('|').map(v => v.trim())
  const correctAnswer = variants[0]
  const acceptedVariants = variants.slice(1)
  
  return { correctAnswer, acceptedVariants }
}

/**
 * Calculate confidence-based flagging
 */
export function shouldFlagAnswer(confidence: number, threshold: number = 0.65): boolean {
  return confidence < threshold
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(originalName: string, prefix?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const extension = originalName.split('.').pop()
  const baseName = originalName.replace(/\.[^/.]+$/, '')
  
  return `${prefix ? prefix + '-' : ''}${baseName}-${timestamp}.${extension}`
}

/**
 * Validate file type for uploads
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

/**
 * Calculate grade statistics
 */
export function calculateGradeStats(grades: Array<{ points_earned: number; points_possible: number }>) {
  if (grades.length === 0) {
    return {
      totalPointsEarned: 0,
      totalPointsPossible: 0,
      percentage: 0,
      letterGrade: 'F'
    }
  }
  
  const totalPointsEarned = grades.reduce((sum, grade) => sum + grade.points_earned, 0)
  const totalPointsPossible = grades.reduce((sum, grade) => sum + grade.points_possible, 0)
  const percentage = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0
  
  const letterGrade = getLetterGrade(percentage)
  
  return {
    totalPointsEarned,
    totalPointsPossible,
    percentage: Math.round(percentage * 100) / 100,
    letterGrade
  }
}

/**
 * Convert percentage to letter grade
 */
export function getLetterGrade(percentage: number): string {
  if (percentage >= 97) return 'A+'
  if (percentage >= 93) return 'A'
  if (percentage >= 90) return 'A-'
  if (percentage >= 87) return 'B+'
  if (percentage >= 83) return 'B'
  if (percentage >= 80) return 'B-'
  if (percentage >= 77) return 'C+'
  if (percentage >= 73) return 'C'
  if (percentage >= 70) return 'C-'
  if (percentage >= 67) return 'D+'
  if (percentage >= 63) return 'D'
  if (percentage >= 60) return 'D-'
  return 'F'
}

