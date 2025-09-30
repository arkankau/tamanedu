import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Download, RefreshCw, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { calculateGradeStats, getLetterGrade } from '@/lib/utils'
import { GradingTable } from '@/components/GradingTable'
import { ExportButtons } from '@/components/ExportButtons'

interface PageProps {
  params: {
    sessionId: string
  }
}

async function getGradingSession(sessionId: string, userId: string) {
  // Use DatabaseService to get session with details
  const result = await supabaseAdmin.getSessionWithDetails(sessionId, userId)
  
  if (result.error || !result.data) {
    return null
  }

  return result.data
}

export default async function GradingResultsPage({ params }: PageProps) {
  const user = await getUser()
  const resolvedParams = await params

  if (!user) {
    redirect('/auth/login')
  }

  const data = await getGradingSession(resolvedParams.sessionId, user.id)

  if (!data) {
    redirect('/dashboard')
  }

  const { session, students, answerKeys } = data

  // Calculate class statistics
  const allGrades = students.flatMap(s => s.grades || [])
  const classStats = allGrades.length > 0 ? calculateGradeStats(allGrades) : null
  
  const studentStats = students.map(student => {
    const grades = student.grades || []
    const responses = student.responses || []
    const stats = calculateGradeStats(grades)
    
    return {
      ...student,
      stats,
      correctCount: grades.filter(g => g.is_correct).length,
      totalQuestions: answerKeys.length,
      flaggedCount: responses.filter(r => r.is_flagged).length
    }
  })

  const classAverage = studentStats.length > 0 
    ? studentStats.reduce((sum, student) => sum + student.stats.percentage, 0) / studentStats.length
    : 0

  const highestScore = studentStats.length > 0 
    ? Math.max(...studentStats.map(s => s.stats.percentage))
    : 0

  const lowestScore = studentStats.length > 0 
    ? Math.min(...studentStats.map(s => s.stats.percentage))
    : 0

  const totalFlagged = studentStats.reduce((sum, student) => sum + student.flaggedCount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
              {session.description && (
                <p className="text-gray-600 mt-1">{session.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Created on {new Date(session.created_at).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <ExportButtons sessionId={session.id} sessionTitle={session.title} />
              
              <Link
                href={`/grading/${session.id}/regrade`}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-grade
              </Link>
            </div>
          </div>
        </div>

        {/* Class Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Class Average</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(classAverage * 100) / 100}%
                </p>
                <p className="text-xs text-gray-500">
                  {getLetterGrade(classAverage)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Highest Score</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(highestScore * 100) / 100}%
                </p>
                <p className="text-xs text-gray-500">
                  {getLetterGrade(highestScore)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-lg">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Lowest Score</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(lowestScore * 100) / 100}%
                </p>
                <p className="text-xs text-gray-500">
                  {getLetterGrade(lowestScore)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Flagged Answers</p>
                <p className="text-2xl font-semibold text-gray-900">{totalFlagged}</p>
                <p className="text-xs text-gray-500">
                  Low OCR confidence
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Grading Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Student Results</h2>
            <p className="text-sm text-gray-500">
              {students.length} students • {answerKeys.length} questions
            </p>
          </div>
          
          <GradingTable 
            students={studentStats}
            answerKeys={answerKeys}
            sessionId={session.id}
          />
        </div>

        {/* Question Analysis */}
        {answerKeys.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Question Analysis</h2>
              <p className="text-sm text-gray-500">
                Performance breakdown by question
              </p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {answerKeys.map((answerKey) => {
                  const questionGrades = allGrades.filter(g => g.question_number === answerKey.question_number)
                  const correctCount = questionGrades.filter(g => g.is_correct).length
                  const totalCount = questionGrades.length
                  const percentage = totalCount > 0 ? (correctCount / totalCount) * 100 : 0
                  
                  return (
                    <div key={answerKey.question_number} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">
                          Question {answerKey.question_number}
                        </h3>
                        <span className={`text-sm font-medium ${
                          percentage >= 80 ? 'text-green-600' :
                          percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        Correct Answer: <span className="font-medium">{answerKey.correct_answer}</span>
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{correctCount}/{totalCount} correct</span>
                        <span>{answerKey.points} pts</span>
                      </div>
                      
                      <div className="mt-2 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            percentage >= 80 ? 'bg-green-500' :
                            percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

