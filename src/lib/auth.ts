import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { AuthService, User } from './auth-mysql'

export async function getUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return null
    }
    
    const { user, error } = await AuthService.verifyToken(token)
    
    // Handle database unavailability gracefully
    if (error === 'Database not available') {
      console.warn('⚠️  Database not available - authentication skipped')
      return null
    }
    
    return user
    
  } catch (error) {
    console.error('Error in getUser:', error)
    return null
  }
}

export async function signOut() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (token) {
      await AuthService.signOut(token)
    }
    
    // Clear the cookie
    cookieStore.set('auth-token', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error in signOut:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // For MySQL implementation, we just pass through the request
  // Token validation happens in individual API routes
  
  return { response }
}
