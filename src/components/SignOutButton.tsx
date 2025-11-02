'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'

export function SignOutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      // Redirect regardless of response status
      router.push('/auth/login')
      router.refresh()
    } catch (error) {
      console.error('Unexpected sign out error:', error)
      // Still redirect even if there's an error
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-gray-700 bg-white rounded-xl font-medium hover:border-pink-200 hover:bg-pink-50 hover:text-[#8E165E] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <LogOut className="h-5 w-5" />
      )}
      <span>Sign Out</span>
    </button>
  )
}
