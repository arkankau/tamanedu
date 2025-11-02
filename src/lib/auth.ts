import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { DatabaseService } from './chromadb'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
const JWT_EXPIRES_IN = '7d'

export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface AuthResult {
  user?: User
  token?: string
  error?: string
}

export class AuthService {
  // Create new user account
  static async signUp(email: string, password: string, name?: string): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUserResult = await DatabaseService.getUserByEmail(email)

      if (existingUserResult.data) {
        return { error: 'User with this email already exists' }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user
      const result = await DatabaseService.createUser(email, hashedPassword, name)

      if (result.error || !result.data) {
        return { error: result.error || 'Failed to create user account' }
      }

      const user: User = {
        id: result.data.id,
        email: result.data.email,
        name: result.data.name,
        created_at: result.data.created_at
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      )

      return {
        user,
        token,
      }

    } catch (error: any) {
      console.error('SignUp error:', error)
      return { error: 'Failed to create account' }
    }
  }

  // Sign in user
  static async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // Get user with password hash
      const userResult = await DatabaseService.getUserByEmail(email)

      if (userResult.error || !userResult.data) {
        return { error: 'Invalid email or password' }
      }

      const userData = userResult.data

      // Verify password
      const isValidPassword = await bcrypt.compare(password, userData.password)
      
      if (!isValidPassword) {
        return { error: 'Invalid email or password' }
      }

      const user: User = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        created_at: userData.created_at
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      )

      return {
        user,
        token
      }

    } catch (error: any) {
      console.error('SignIn error:', error)
      return { error: 'Failed to sign in' }
    }
  }

  // Get user from request
  static async getUserFromRequest(request: NextRequest): Promise<User | null> {
    try {
      // Get token from Authorization header or cookie
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value

      if (!token) {
        return null
      }

      // Verify and decode token
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }

      // Get user from database
      const userResult = await DatabaseService.getUserById(decoded.userId)

      if (userResult.error || !userResult.data) {
        return null
      }

      const user: User = {
        id: userResult.data.id,
        email: userResult.data.email,
        name: userResult.data.name,
        created_at: userResult.data.created_at
      }

      return user

    } catch (error: any) {
      console.error('getUserFromRequest error:', error)
      return null
    }
  }

  // Verify token
  static verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
      return decoded
    } catch (error) {
      return null
    }
  }
}

// Helper function to get current user (for server components)
export async function getUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return null
    }

    const decoded = AuthService.verifyToken(token)
    
    if (!decoded) {
      return null
    }

    const userResult = await DatabaseService.getUserById(decoded.userId)

    if (userResult.error || !userResult.data) {
      return null
    }

    const user: User = {
      id: userResult.data.id,
      email: userResult.data.email,
      name: userResult.data.name,
      created_at: userResult.data.created_at
    }

    return user

  } catch (error) {
    console.error('getUser error:', error)
    return null
  }
}
