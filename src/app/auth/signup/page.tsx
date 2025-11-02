'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, ArrowLeft, Check } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()

  const passwordRequirements = [
    { met: password.length >= 6, text: 'At least 6 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[0-9]/.test(password), text: 'One number' },
  ]

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Signup failed')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center p-4">
      {/* Back Button */}
      <Link 
        href="/" 
        className="fixed top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-[#A91B6F] transition-colors group"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Home</span>
      </Link>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image 
            src="/tamanedu-logo.svg" 
            alt="TamanEdu" 
            width={180} 
            height={45}
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-brand font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-gray-600">Start grading smarter in under 2 minutes</p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8 space-y-6">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@school.edu"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A91B6F] focus:border-transparent transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a strong password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A91B6F] focus:border-transparent transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {/* Password Requirements */}
              {password && (
                <div className="space-y-2 pt-2">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center ${req.met ? 'bg-[#7C9E7A]' : 'bg-gray-200'} transition-colors`}>
                        {req.met && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className={req.met ? 'text-[#7C9E7A] font-medium' : 'text-gray-500'}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[linear-gradient(135deg,#A91B6F_0%,#DB2777_100%)] text-white px-6 py-3.5 rounded-xl font-semibold hover:shadow-[0_10px_30px_-10px_rgba(169,27,111,0.4)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-primary-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>
            </p>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Already have an account?</span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link
            href="/auth/login"
            className="block w-full text-center border-2 border-gray-200 text-gray-700 px-6 py-3.5 rounded-xl font-semibold hover:border-pink-200 hover:bg-pink-50 hover:text-[#8E165E] transition-all duration-300"
          >
            Sign In Instead
          </Link>
        </div>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { emoji: '⚡', text: 'Fast Setup' },
            { emoji: '🔒', text: 'Secure' },
            { emoji: '✨', text: 'Free Trial' },
          ].map((benefit, i) => (
            <div key={i} className="text-sm">
              <div className="text-2xl mb-1">{benefit.emoji}</div>
              <div className="text-gray-600 font-medium">{benefit.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
