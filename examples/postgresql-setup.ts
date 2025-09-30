// Example: Using PostgreSQL instead of Supabase
// This shows how to adapt the main database functions

import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // For local development:
  // host: 'localhost',
  // port: 5432,
  // database: 'tamanedu',
  // user: 'your_username',
  // password: 'your_password',
})

// User authentication functions
export class AuthService {
  static async createUser(email: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 12)
    
    const query = `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, created_at
    `
    
    try {
      const result = await pool.query(query, [email, hashedPassword])
      return { user: result.rows[0], error: null }
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        return { user: null, error: 'Email already exists' }
      }
      return { user: null, error: 'Failed to create user' }
    }
  }

  static async signIn(email: string, password: string) {
    const query = 'SELECT id, email, password_hash FROM users WHERE email = $1'
    
    try {
      const result = await pool.query(query, [email])
      
      if (result.rows.length === 0) {
        return { user: null, error: 'Invalid credentials' }
      }
      
      const user = result.rows[0]
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      
      if (!isValidPassword) {
        return { user: null, error: 'Invalid credentials' }
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )
      
      return {
        user: { id: user.id, email: user.email },
        token,
        error: null
      }
    } catch (error) {
      return { user: null, error: 'Authentication failed' }
    }
  }

  static async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      return { user: decoded, error: null }
    } catch (error) {
      return { user: null, error: 'Invalid token' }
    }
  }
}

// Database service for grading sessions
export class GradingSessionService {
  static async createSession(teacherId: string, title: string, description?: string) {
    const query = `
      INSERT INTO grading_sessions (teacher_id, title, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `
    
    try {
      const result = await pool.query(query, [teacherId, title, description])
      return { session: result.rows[0], error: null }
    } catch (error) {
      return { session: null, error: 'Failed to create session' }
    }
  }

  static async getSessionsByTeacher(teacherId: string) {
    const query = `
      SELECT 
        gs.*,
        COUNT(s.id) as student_count
      FROM grading_sessions gs
      LEFT JOIN students s ON gs.id = s.session_id
      WHERE gs.teacher_id = $1
      GROUP BY gs.id
      ORDER BY gs.updated_at DESC
    `
    
    try {
      const result = await pool.query(query, [teacherId])
      return { sessions: result.rows, error: null }
    } catch (error) {
      return { sessions: [], error: 'Failed to fetch sessions' }
    }
  }

  static async getSessionWithDetails(sessionId: string, teacherId: string) {
    const sessionQuery = `
      SELECT * FROM grading_sessions 
      WHERE id = $1 AND teacher_id = $2
    `
    
    const studentsQuery = `
      SELECT 
        s.*,
        json_agg(
          json_build_object(
            'id', g.id,
            'question_number', g.question_number,
            'is_correct', g.is_correct,
            'points_earned', g.points_earned,
            'points_possible', g.points_possible
          )
        ) FILTER (WHERE g.id IS NOT NULL) as grades,
        json_agg(
          json_build_object(
            'id', r.id,
            'question_number', r.question_number,
            'raw_answer', r.raw_answer,
            'normalized_answer', r.normalized_answer,
            'ocr_confidence', r.ocr_confidence,
            'is_flagged', r.is_flagged,
            'page_number', r.page_number
          )
        ) FILTER (WHERE r.id IS NOT NULL) as responses
      FROM students s
      LEFT JOIN grades g ON s.id = g.student_id
      LEFT JOIN responses r ON s.id = r.student_id
      WHERE s.session_id = $1
      GROUP BY s.id
      ORDER BY s.name
    `
    
    const answerKeysQuery = `
      SELECT * FROM answer_keys 
      WHERE session_id = $1 
      ORDER BY question_number
    `
    
    try {
      const [sessionResult, studentsResult, answerKeysResult] = await Promise.all([
        pool.query(sessionQuery, [sessionId, teacherId]),
        pool.query(studentsQuery, [sessionId]),
        pool.query(answerKeysQuery, [sessionId])
      ])
      
      if (sessionResult.rows.length === 0) {
        return { data: null, error: 'Session not found' }
      }
      
      return {
        data: {
          session: sessionResult.rows[0],
          students: studentsResult.rows,
          answerKeys: answerKeysResult.rows
        },
        error: null
      }
    } catch (error) {
      return { data: null, error: 'Failed to fetch session details' }
    }
  }
}

// Answer key service
export class AnswerKeyService {
  static async uploadAnswerKey(sessionId: string, answerKeys: any[]) {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Delete existing answer keys
      await client.query('DELETE FROM answer_keys WHERE session_id = $1', [sessionId])
      
      // Insert new answer keys
      for (const key of answerKeys) {
        await client.query(
          `INSERT INTO answer_keys (session_id, question_number, correct_answer, accepted_variants, points)
           VALUES ($1, $2, $3, $4, $5)`,
          [sessionId, key.question_number, key.correct_answer, JSON.stringify(key.accepted_variants), key.points]
        )
      }
      
      await client.query('COMMIT')
      return { success: true, error: null }
    } catch (error) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Failed to upload answer key' }
    } finally {
      client.release()
    }
  }
}

// Usage in API routes:
// 
// // pages/api/auth/login.ts
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' })
//   }
// 
//   const { email, password } = req.body
//   const result = await AuthService.signIn(email, password)
// 
//   if (result.error) {
//     return res.status(401).json({ error: result.error })
//   }
// 
//   // Set HTTP-only cookie
//   res.setHeader('Set-Cookie', `token=${result.token}; HttpOnly; Path=/; Max-Age=604800`)
//   res.status(200).json({ user: result.user })
// }

// Environment variables needed:
// DATABASE_URL=postgresql://username:password@localhost:5432/tamanedu
// JWT_SECRET=your-super-secret-jwt-key

