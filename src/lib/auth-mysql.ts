import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { executeQuery, executeQuerySingle, generateId } from './mysql'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
const JWT_EXPIRES_IN = '7d'

export interface User {
  id: string
  email: string
  email_verified: boolean
  created_at: string
}

export interface AuthResult {
  user?: User
  token?: string
  error?: string
}

export class AuthService {
  // Create new user account
  static async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await executeQuerySingle(
        'SELECT id FROM users WHERE email = ?',
        [email]
      )

      if (existingUser.data) {
        return { error: 'User with this email already exists' }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)
      const userId = generateId()

      // Create user
      const result = await executeQuery(
        `INSERT INTO users (id, email, password_hash, email_verified) 
         VALUES (?, ?, ?, ?)`,
        [userId, email, hashedPassword, true] // Set to true for now, implement email verification later
      )

      if (result.error) {
        return { error: result.error }
      }

      // Get created user
      const userResult = await executeQuerySingle<User>(
        'SELECT id, email, email_verified, created_at FROM users WHERE id = ?',
        [userId]
      )

      if (userResult.error || !userResult.data) {
        return { error: 'Failed to create user account' }
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: userResult.data.id, 
          email: userResult.data.email 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      )

      return {
        user: userResult.data,
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
      const userResult = await executeQuerySingle<User & { password_hash: string }>(
        'SELECT id, email, email_verified, password_hash, created_at FROM users WHERE email = ?',
        [email]
      )

      if (userResult.error || !userResult.data) {
        return { error: 'Invalid email or password' }
      }

      const user = userResult.data

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      
      if (!isValidPassword) {
        return { error: 'Invalid email or password' }
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

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = user

      return {
        user: userWithoutPassword,
        token,
      }

    } catch (error: any) {
      console.error('SignIn error:', error)
      return { error: 'Authentication failed' }
    }
  }

  // Verify JWT token
  static async verifyToken(token: string): Promise<{ user: User | null, error?: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      // Get fresh user data from database
      const userResult = await executeQuerySingle<User>(
        'SELECT id, email, email_verified, created_at FROM users WHERE id = ?',
        [decoded.userId]
      )

      // Handle database connection issues gracefully
      if (userResult.error === 'Database not available') {
        console.warn('⚠️  Database not available, skipping user verification')
        return { user: null, error: 'Database not available' }
      }

      if (userResult.error || !userResult.data) {
        return { user: null, error: 'User not found' }
      }

      return { user: userResult.data }

    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return { user: null, error: 'Token expired' }
      }
      return { user: null, error: 'Invalid token' }
    }
  }

  // Get user from request (checks cookies and Authorization header)
  static async getUserFromRequest(request: NextRequest): Promise<User | null> {
    try {
      // Try to get token from cookies first
      let token = request.cookies.get('auth-token')?.value

      // If not in cookies, try Authorization header
      if (!token) {
        const authHeader = request.headers.get('Authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7)
        }
      }

      if (!token) {
        return null
      }

      const { user } = await this.verifyToken(token)
      return user

    } catch (error) {
      console.error('Get user from request error:', error)
      return null
    }
  }

  // Sign out (optional - for token blacklisting)
  static async signOut(token: string): Promise<{ success: boolean, error?: string }> {
    try {
      // For now, we'll just return success
      // In a more secure implementation, you could blacklist the token
      // by storing it in the user_sessions table with an expiry
      
      return { success: true }

    } catch (error: any) {
      console.error('SignOut error:', error)
      return { success: false, error: 'Sign out failed' }
    }
  }

  // Change password
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean, error?: string }> {
    try {
      // Get current password hash
      const userResult = await executeQuerySingle<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      )

      if (userResult.error || !userResult.data) {
        return { success: false, error: 'User not found' }
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, userResult.data.password_hash)
      
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' }
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12)

      // Update password
      const updateResult = await executeQuery(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [hashedNewPassword, userId]
      )

      if (updateResult.error) {
        return { success: false, error: updateResult.error }
      }

      return { success: true }

    } catch (error: any) {
      console.error('Change password error:', error)
      return { success: false, error: 'Failed to change password' }
    }
  }
}

// Middleware helper to protect routes
export async function requireAuth(request: NextRequest): Promise<{ user: User | null, error?: string }> {
  const user = await AuthService.getUserFromRequest(request)
  
  if (!user) {
    return { user: null, error: 'Authentication required' }
  }

  return { user }
}









