import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { DatabaseService } from '@/lib/chromadb'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, FileText, Clock, CheckCircle, Users, TrendingUp, Sparkles } from 'lucide-react'
import { SignOutButton } from '@/components/SignOutButton'

async function getGradingSessions(userId: string) {
  try {
    const { data: sessions, error } = await DatabaseService.getGradingSessionsByTeacher(userId)

    if (error) {
      console.warn('Error fetching grading sessions (database may not be available):', error)
      return []
    }

    return sessions || []
  } catch (error) {
    console.warn('Could not connect to database:', error)
    return []
  }
}

export default async function DashboardPage() {
  const user = await getUser()

  if (!user) {
    redirect('/auth/login')
  }

  let sessions = []
  try {
    sessions = await getGradingSessions(user.id)
  } catch (error) {
    console.warn('Could not fetch grading sessions (database may not be available):', error)
    sessions = []
  }

  const completedSessions = sessions.filter((s: any) => s.status === 'completed').length
  const totalStudents = sessions.reduce((acc: number, s: any) => acc + (s.student_count || 0), 0)

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Completed' },
      draft: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'In Progress' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Archived' },
    }
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Unknown' }
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <Image 
                src="/tamanedu-logo.svg" 
                alt="TamanEdu" 
                width={160} 
                height={40}
                className="h-10 w-auto cursor-pointer"
              />
            </Link>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name || 'Teacher'}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-4xl font-brand font-bold text-gray-900 mb-2">
            Welcome back, {user.name || user.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Manage your grading sessions and track student progress.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-soft transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#A91B6F]" />
              </div>
              <TrendingUp className="h-5 w-5 text-[#7C9E7A]" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{sessions.length}</h3>
            <p className="text-sm text-gray-600">Total Sessions</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-soft transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-[#7C9E7A]" />
              </div>
              <TrendingUp className="h-5 w-5 text-[#7C9E7A]" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{completedSessions}</h3>
            <p className="text-sm text-gray-600">Completed</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-soft transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <TrendingUp className="h-5 w-5 text-[#7C9E7A]" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{totalStudents}</h3>
            <p className="text-sm text-gray-600">Total Students</p>
          </div>
        </div>

        {/* Grading Sessions */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-brand font-bold text-gray-900">Grading Sessions</h2>
              <p className="text-gray-600 mt-1">Manage and review your grading sessions</p>
            </div>
            <Link
              href="/grading/new"
              className="inline-flex items-center gap-2 bg-[linear-gradient(135deg,#A91B6F_0%,#DB2777_100%)] text-white px-6 py-3 rounded-xl font-semibold hover:shadow-[0_10px_30px_-10px_rgba(169,27,111,0.4)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              New Session
            </Link>
          </div>

          <div className="p-6">
            {sessions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-[linear-gradient(135deg,#A91B6F_0%,#DB2777_100%)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-brand font-bold text-gray-900 mb-3">
                  Start Your First Grading Session
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Upload student worksheets and let AI do the grading for you. It's fast, accurate, and easy!
                </p>
                <Link
                  href="/grading/new"
                  className="inline-flex items-center gap-2 bg-[linear-gradient(135deg,#A91B6F_0%,#DB2777_100%)] text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-[0_10px_30px_-10px_rgba(169,27,111,0.4)] transition-all duration-300 hover:-translate-y-1"
                >
                  <Plus className="h-6 w-6" />
                  Create Your First Session
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session: any) => (
                  <Link
                    key={session.id}
                    href={`/grading/${session.id}`}
                    className="group block bg-gray-50 hover:bg-white border border-gray-100 hover:border-pink-200 rounded-2xl p-6 transition-all duration-300 hover:shadow-soft hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[#A91B6F] transition-colors">
                            {session.name}
                          </h3>
                          {getStatusBadge(session.status)}
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{session.student_count || 0} students</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(session.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[#A91B6F] group-hover:translate-x-1 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
