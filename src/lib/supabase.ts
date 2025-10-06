// MySQL Database Services
// This file replaces the Supabase client with MySQL-based services

import { executeQuery, executeQuerySingle, executeTransaction, generateId } from './mysql'
import { FileStorageService } from './file-storage'

// Dynamic import for server-side only modules
let AuthService: any = null

// Initialize AuthService only on server-side
if (typeof window === 'undefined') {
  try {
    AuthService = require('./auth-mysql').AuthService
  } catch (error) {
    console.warn('Failed to load AuthService:', error)
  }
}

// Database service class to replace Supabase client
export class DatabaseService {
  // Grading Sessions
  static async createGradingSession(
    teacherId: string, 
    title: string, 
    description?: string
  ) {
    const sessionId = generateId()
    
    const result = await executeQuery(
      `INSERT INTO grading_sessions (id, teacher_id, title, description) 
       VALUES (?, ?, ?, ?)`,
      [sessionId, teacherId, title, description || null]
    )

    if (result.error) {
      return { data: null, error: result.error }
    }

    // Return the created session
    const session = await executeQuerySingle(
      'SELECT * FROM grading_sessions WHERE id = ?',
      [sessionId]
    )

    return session
  }

  static async getGradingSessionsByTeacher(teacherId: string) {
    return executeQuery(
      `SELECT 
        gs.*,
        COUNT(s.id) as student_count
       FROM grading_sessions gs
       LEFT JOIN students s ON gs.id = s.session_id
       WHERE gs.teacher_id = ?
       GROUP BY gs.id
       ORDER BY gs.updated_at DESC`,
      [teacherId]
    )
  }

  static async getGradingSession(sessionId: string, teacherId: string) {
    return executeQuerySingle(
      'SELECT * FROM grading_sessions WHERE id = ? AND teacher_id = ?',
      [sessionId, teacherId]
    )
  }

  // Students
  static async createStudent(sessionId: string, name: string, studentId?: string) {
    const id = generateId()
    
    const result = await executeQuery(
      'INSERT INTO students (id, session_id, name, student_id) VALUES (?, ?, ?, ?)',
      [id, sessionId, name, studentId || null]
    )

    if (result.error) {
      return { data: null, error: result.error }
    }

    return executeQuerySingle('SELECT * FROM students WHERE id = ?', [id])
  }

  static async getStudentsBySession(sessionId: string) {
    return executeQuery(
      'SELECT * FROM students WHERE session_id = ? ORDER BY name',
      [sessionId]
    )
  }

  static async createStudents(students: any[]) {
    const results = []
    for (const student of students) {
      const studentId = generateId()
      const result = await executeQuery(
        `INSERT INTO students (id, session_id, name, student_id) 
         VALUES (?, ?, ?, ?)`,
        [
          studentId,
          student.session_id,
          student.name,
          student.student_id
        ]
      )
      if (result.error) {
        return { error: result.error }
      }
      // Get the created student
      const createdStudent = await executeQuerySingle(
        'SELECT * FROM students WHERE id = ?',
        [studentId]
      )
      if (createdStudent.data) {
        results.push(createdStudent.data)
      }
    }
    return { data: results }
  }

  static async createResponses(responses: any[]) {
    const results = []
    for (const response of responses) {
      const result = await executeQuery(
        `INSERT INTO responses (id, student_id, question_number, raw_answer, normalized_answer, ocr_confidence, is_flagged, page_number) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          response.student_id,
          response.question_number ?? 1,
          response.raw_answer ?? response.answer_text ?? '[No text detected]',
          response.normalized_answer ?? response.answer_text ?? '[No text detected]',
          response.ocr_confidence ?? response.confidence_score ?? 0,
          response.is_flagged ?? false,
          response.page_number ?? null
        ]
      )
      if (result.error) {
        return { error: result.error }
      }
      results.push(result.data)
    }
    return { data: results }
  }

  // Answer Keys
  static async deleteAnswerKeysBySession(sessionId: string) {
    return executeQuery(
      'DELETE FROM answer_keys WHERE session_id = ?',
      [sessionId]
    )
  }

  static async createAnswerKeys(answerKeys: any[]) {
    const results = []
    for (const key of answerKeys) {
      const result = await executeQuery(
        `INSERT INTO answer_keys (id, session_id, question_number, correct_answer, accepted_variants, points)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          key.session_id,
          key.question_number,
          key.correct_answer,
          JSON.stringify(key.accepted_variants || []),
          key.points || 1
        ]
      )
      if (result.error) {
        return { error: result.error }
      }
    }
    return { data: results }
  }

  // Grading methods
  static async getStudentsBySession(sessionId: string) {
    return executeQuery(
      'SELECT id, name FROM students WHERE session_id = ? ORDER BY name',
      [sessionId]
    )
  }

  static async getAnswerKeysBySession(sessionId: string) {
    return executeQuery(
      'SELECT question_number, correct_answer, accepted_variants, points FROM answer_keys WHERE session_id = ? ORDER BY question_number',
      [sessionId]
    )
  }

  static async getResponsesByStudent(studentId: string) {
    return executeQuery(
      'SELECT question_number, normalized_answer FROM responses WHERE student_id = ? ORDER BY question_number',
      [studentId]
    )
  }

  static async deleteGradesByStudent(studentId: string) {
    return executeQuery(
      'DELETE FROM grades WHERE student_id = ?',
      [studentId]
    )
  }

  static async createGrades(grades: any[]) {
    const results = []
    for (const grade of grades) {
      const result = await executeQuery(
        `INSERT INTO grades (id, student_id, question_number, is_correct, points_earned, points_possible)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          grade.student_id,
          grade.question_number,
          grade.is_correct,
          grade.points_earned,
          grade.points_possible
        ]
      )
      if (result.error) {
        return { error: result.error }
      }
      results.push(result.data)
    }
    return { data: results }
  }

  static async createAnswerKeysWithSession(sessionId: string, answerKeys: any[]) {
    return executeTransaction(async (connection) => {
      // Delete existing answer keys
      await connection.execute(
        'DELETE FROM answer_keys WHERE session_id = ?',
        [sessionId]
      )

      // Insert new answer keys
      for (const key of answerKeys) {
        await connection.execute(
          `INSERT INTO answer_keys (id, session_id, question_number, correct_answer, accepted_variants, points)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            generateId(),
            sessionId,
            key.question_number,
            key.correct_answer,
            JSON.stringify(key.accepted_variants || []),
            key.points || 1.0
          ]
        )
      }

      return answerKeys
    })
  }

  static async getAnswerKeysBySession(sessionId: string) {
    const result = await executeQuery(
      'SELECT * FROM answer_keys WHERE session_id = ? ORDER BY question_number',
      [sessionId]
    )

    if (result.error) {
      return result
    }

    // Debug: log the raw database results
    console.log('Raw database results for answer keys:', result.data)

    // Parse JSON accepted_variants with error handling
    const data = result.data.map((key: any) => {
      let acceptedVariants = []
      
      if (key.accepted_variants !== null && key.accepted_variants !== undefined) {
        try {
          // Debug: log the raw accepted_variants value
          console.log(`Question ${key.question_number} - Raw accepted_variants:`, key.accepted_variants)
          
          // Handle different data types
          if (typeof key.accepted_variants === 'string') {
            // If it's a string, try to parse it
            const trimmed = key.accepted_variants.trim()
            if (trimmed === '' || trimmed === '[]' || trimmed === 'null') {
              acceptedVariants = []
            } else {
              try {
                acceptedVariants = JSON.parse(trimmed)
                // Ensure it's an array
                if (!Array.isArray(acceptedVariants)) {
                  acceptedVariants = []
                }
              } catch (parseError) {
                console.warn(`JSON parse failed for question ${key.question_number}, using empty array`)
                acceptedVariants = []
              }
            }
          } else if (Array.isArray(key.accepted_variants)) {
            // If it's already an array, use it directly
            acceptedVariants = key.accepted_variants
          } else {
            acceptedVariants = []
          }
        } catch (error) {
          console.error(`Failed to parse accepted_variants for question ${key.question_number}:`, error)
          console.error(`Raw value was:`, key.accepted_variants)
          acceptedVariants = []
        }
      } else {
        console.log(`Question ${key.question_number} - No accepted_variants field`)
        acceptedVariants = []
      }
      
      return {
        ...key,
        accepted_variants: acceptedVariants
      }
    })

    return { data, error: null }
  }

  // Responses
  static async createResponse(
    studentId: string,
    questionNumber: number,
    rawAnswer: string,
    normalizedAnswer: string,
    ocrConfidence: number,
    isFlagged: boolean,
    pageNumber?: number
  ) {
    const id = generateId()
    
    return executeQuery(
      `INSERT INTO responses (id, student_id, question_number, raw_answer, normalized_answer, ocr_confidence, is_flagged, page_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, studentId, questionNumber, rawAnswer, normalizedAnswer, ocrConfidence, isFlagged, pageNumber || null]
    )
  }

  static async updateResponse(responseId: string, rawAnswer: string, normalizedAnswer: string) {
    return executeQuery(
      'UPDATE responses SET raw_answer = ?, normalized_answer = ?, updated_at = NOW() WHERE id = ?',
      [rawAnswer, normalizedAnswer, responseId]
    )
  }

  static async getResponsesByStudent(studentId: string) {
    return executeQuery(
      'SELECT * FROM responses WHERE student_id = ? ORDER BY question_number',
      [studentId]
    )
  }

  // Grades
  static async createGrade(
    studentId: string,
    questionNumber: number,
    isCorrect: boolean,
    pointsEarned: number,
    pointsPossible: number
  ) {
    const id = generateId()
    
    return executeQuery(
      `INSERT INTO grades (id, student_id, question_number, is_correct, points_earned, points_possible)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, studentId, questionNumber, isCorrect, pointsEarned, pointsPossible]
    )
  }

  static async updateGrade(
    studentId: string,
    questionNumber: number,
    isCorrect: boolean,
    pointsEarned: number
  ) {
    return executeQuery(
      'UPDATE grades SET is_correct = ?, points_earned = ?, updated_at = NOW() WHERE student_id = ? AND question_number = ?',
      [isCorrect, pointsEarned, studentId, questionNumber]
    )
  }

  static async deleteGradesByStudent(studentId: string) {
    return executeQuery(
      'DELETE FROM grades WHERE student_id = ?',
      [studentId]
    )
  }

  static async getGradesByStudent(studentId: string) {
    return executeQuery(
      'SELECT * FROM grades WHERE student_id = ? ORDER BY question_number',
      [studentId]
    )
  }

  // Complex queries for grading results
  static async getSessionWithDetails(sessionId: string, teacherId: string) {
    try {
      // Get session
      const sessionResult = await executeQuerySingle(
        'SELECT * FROM grading_sessions WHERE id = ? AND teacher_id = ?',
        [sessionId, teacherId]
      )

      if (sessionResult.error || !sessionResult.data) {
        return { data: null, error: sessionResult.error || 'Session not found' }
      }

      // Get students with grades and responses
      const studentsResult = await executeQuery(
        `SELECT 
          s.*,
          g.id as grade_id,
          g.question_number as grade_question,
          g.is_correct,
          g.points_earned,
          g.points_possible,
          r.id as response_id,
          r.question_number as response_question,
          r.raw_answer,
          r.normalized_answer,
          r.ocr_confidence,
          r.is_flagged,
          r.page_number
         FROM students s
         LEFT JOIN grades g ON s.id = g.student_id
         LEFT JOIN responses r ON s.id = r.student_id AND g.question_number = r.question_number
         WHERE s.session_id = ?
         ORDER BY s.name, g.question_number`,
        [sessionId]
      )

      if (studentsResult.error) {
        return { data: null, error: studentsResult.error }
      }

      // Get answer keys
      const answerKeysResult = await this.getAnswerKeysBySession(sessionId)

      if (answerKeysResult.error) {
        return { data: null, error: answerKeysResult.error }
      }

      // Group student data
      const studentsMap = new Map()
      
      studentsResult.data.forEach((row: any) => {
        if (!studentsMap.has(row.id)) {
          studentsMap.set(row.id, {
            id: row.id,
            name: row.name,
            student_id: row.student_id,
            session_id: row.session_id,
            created_at: row.created_at,
            grades: [],
            responses: []
          })
        }

        const student = studentsMap.get(row.id)

        if (row.grade_id) {
          student.grades.push({
            id: row.grade_id,
            question_number: row.grade_question,
            is_correct: row.is_correct,
            points_earned: row.points_earned,
            points_possible: row.points_possible
          })
        }

        if (row.response_id) {
          student.responses.push({
            id: row.response_id,
            question_number: row.response_question,
            raw_answer: row.raw_answer,
            normalized_answer: row.normalized_answer,
            ocr_confidence: row.ocr_confidence,
            is_flagged: row.is_flagged,
            page_number: row.page_number
          })
        }
      })

      return {
        data: {
          session: sessionResult.data,
          students: Array.from(studentsMap.values()),
          answerKeys: answerKeysResult.data
        },
        error: null
      }

    } catch (error: any) {
      console.error('Get session with details error:', error)
      return { data: null, error: 'Failed to get session details' }
    }
  }
}

// Export compatibility aliases
export const supabase = {
  auth: AuthService || {
    signUp: () => Promise.resolve({ user: null, error: 'Auth not available on client-side' }),
    signIn: () => Promise.resolve({ user: null, error: 'Auth not available on client-side' }),
    signOut: () => Promise.resolve({ success: false, error: 'Auth not available on client-side' }),
    verifyToken: () => Promise.resolve({ user: null, error: 'Auth not available on client-side' }),
    getUserFromRequest: () => Promise.resolve(null),
    changePassword: () => Promise.resolve({ success: false, error: 'Auth not available on client-side' }),
    getUser: () => Promise.resolve({ data: { user: null }, error: 'Auth not available on client-side' })
  },
  storage: FileStorageService,
  from: (table: string) => ({
    select: () => ({ eq: () => ({ data: [], error: null }) }),
    insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: () => ({ data: null, error: null }) }),
    delete: () => ({ eq: () => ({ data: null, error: null }) })
  })
}

export const supabaseAdmin = DatabaseService

export type Database = {
  public: {
    Tables: {
      grading_sessions: {
        Row: {
          id: string
          teacher_id: string
          title: string
          description: string | null
          created_at: string
          updated_at: string
          status: 'draft' | 'completed' | 'archived'
        }
        Insert: {
          id?: string
          teacher_id: string
          title: string
          description?: string | null
          created_at?: string
          updated_at?: string
          status?: 'draft' | 'completed' | 'archived'
        }
        Update: {
          id?: string
          teacher_id?: string
          title?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          status?: 'draft' | 'completed' | 'archived'
        }
      }
      answer_keys: {
        Row: {
          id: string
          session_id: string
          question_number: number
          correct_answer: string
          accepted_variants: string[]
          points: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_number: number
          correct_answer: string
          accepted_variants?: string[]
          points?: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          question_number?: number
          correct_answer?: string
          accepted_variants?: string[]
          points?: number
          created_at?: string
        }
      }
      students: {
        Row: {
          id: string
          session_id: string
          name: string
          student_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          student_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          name?: string
          student_id?: string | null
          created_at?: string
        }
      }
      responses: {
        Row: {
          id: string
          student_id: string
          question_number: number
          raw_answer: string
          normalized_answer: string
          ocr_confidence: number
          is_flagged: boolean
          page_number: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          question_number: number
          raw_answer: string
          normalized_answer: string
          ocr_confidence: number
          is_flagged?: boolean
          page_number?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          question_number?: number
          raw_answer?: string
          normalized_answer?: string
          ocr_confidence?: number
          is_flagged?: boolean
          page_number?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      grades: {
        Row: {
          id: string
          student_id: string
          question_number: number
          is_correct: boolean
          points_earned: number
          points_possible: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          question_number: number
          is_correct: boolean
          points_earned: number
          points_possible: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          question_number?: number
          is_correct?: boolean
          points_earned?: number
          points_possible?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
