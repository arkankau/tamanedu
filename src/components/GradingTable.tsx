'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle, X, Edit2, Save, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { normalizeText, isAnswerCorrect } from '@/lib/utils'

interface Student {
  id: string
  name: string
  student_id: string | null
  grades: Array<{
    id: string
    question_number: number
    is_correct: boolean
    points_earned: number
    points_possible: number
  }>
  responses: Array<{
    id: string
    question_number: number
    raw_answer: string
    normalized_answer: string
    ocr_confidence: number
    is_flagged: boolean
    page_number: number | null
  }>
  stats: {
    totalPointsEarned: number
    totalPointsPossible: number
    percentage: number
    letterGrade: string
  }
  correctCount: number
  totalQuestions: number
  flaggedCount: number
}

interface AnswerKey {
  id: string
  question_number: number
  correct_answer: string
  accepted_variants: string[]
  points: number
}

interface GradingTableProps {
  students: Student[]
  answerKeys: AnswerKey[]
  sessionId: string
}

export function GradingTable({ students, answerKeys, sessionId }: GradingTableProps) {
  const [editingCell, setEditingCell] = useState<{ studentId: string; questionNumber: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [localStudents, setLocalStudents] = useState(students)

  const handleEditStart = (studentId: string, questionNumber: number, currentValue: string) => {
    setEditingCell({ studentId, questionNumber })
    setEditValue(currentValue)
  }

  const handleEditCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleEditSave = async (studentId: string, questionNumber: number) => {
    if (!editingCell || loading) return

    setLoading(true)

    try {
      const normalizedAnswer = normalizeText(editValue)
      
      // Update response in database
      const { error: responseError } = await supabase
        .from('responses')
        .update({
          raw_answer: editValue,
          normalized_answer: normalizedAnswer,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId)
        .eq('question_number', questionNumber)

      if (responseError) {
        console.error('Error updating response:', responseError)
        return
      }

      // Find answer key for this question
      const answerKey = answerKeys.find(ak => ak.question_number === questionNumber)
      if (!answerKey) return

      // Check if answer is correct
      const isCorrect = isAnswerCorrect(
        normalizedAnswer,
        answerKey.correct_answer,
        answerKey.accepted_variants
      )

      const pointsEarned = isCorrect ? answerKey.points : 0

      // Update grade in database
      const { error: gradeError } = await supabase
        .from('grades')
        .update({
          is_correct: isCorrect,
          points_earned: pointsEarned,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId)
        .eq('question_number', questionNumber)

      if (gradeError) {
        console.error('Error updating grade:', gradeError)
        return
      }

      // Update local state
      setLocalStudents(prev => prev.map(student => {
        if (student.id !== studentId) return student

        const updatedResponses = student.responses.map(response => {
          if (response.question_number === questionNumber) {
            return {
              ...response,
              raw_answer: editValue,
              normalized_answer: normalizedAnswer
            }
          }
          return response
        })

        const updatedGrades = student.grades.map(grade => {
          if (grade.question_number === questionNumber) {
            return {
              ...grade,
              is_correct: isCorrect,
              points_earned: pointsEarned
            }
          }
          return grade
        })

        // Recalculate stats
        const totalPointsEarned = updatedGrades.reduce((sum, grade) => sum + grade.points_earned, 0)
        const totalPointsPossible = updatedGrades.reduce((sum, grade) => sum + grade.points_possible, 0)
        const percentage = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0

        const getLetterGrade = (percentage: number): string => {
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

        return {
          ...student,
          responses: updatedResponses,
          grades: updatedGrades,
          stats: {
            totalPointsEarned,
            totalPointsPossible,
            percentage: Math.round(percentage * 100) / 100,
            letterGrade: getLetterGrade(percentage)
          },
          correctCount: updatedGrades.filter(g => g.is_correct).length
        }
      }))

      setEditingCell(null)
      setEditValue('')

    } catch (error) {
      console.error('Error saving edit:', error)
    } finally {
      setLoading(false)
    }
  }

  const getResponseForQuestion = (student: Student, questionNumber: number) => {
    return student.responses.find(r => r.question_number === questionNumber)
  }

  const getGradeForQuestion = (student: Student, questionNumber: number) => {
    return student.grades.find(g => g.question_number === questionNumber)
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              Student
            </th>
            {answerKeys.map((answerKey) => (
              <th key={answerKey.question_number} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                Q{answerKey.question_number}
                <br />
                <span className="text-gray-400 normal-case">({answerKey.points} pts)</span>
              </th>
            ))}
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Grade
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {localStudents.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                <div>
                  <div className="text-sm font-medium text-gray-900">{student.name}</div>
                  {student.student_id && (
                    <div className="text-sm text-gray-500">{student.student_id}</div>
                  )}
                  {student.flaggedCount > 0 && (
                    <div className="flex items-center mt-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-500 mr-1" />
                      <span className="text-xs text-yellow-600">{student.flaggedCount} flagged</span>
                    </div>
                  )}
                </div>
              </td>
              
              {answerKeys.map((answerKey) => {
                const response = getResponseForQuestion(student, answerKey.question_number)
                const grade = getGradeForQuestion(student, answerKey.question_number)
                const isEditing = editingCell?.studentId === student.id && editingCell?.questionNumber === answerKey.question_number
                
                return (
                  <td key={answerKey.question_number} className="px-3 py-4 text-center">
                    <div className="space-y-1">
                      {/* Student Answer */}
                      <div className="relative">
                        {isEditing ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditSave(student.id, answerKey.question_number)
                                } else if (e.key === 'Escape') {
                                  handleEditCancel()
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditSave(student.id, answerKey.question_number)}
                              disabled={loading}
                              className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                            >
                              <Save className="h-3 w-3" />
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="p-1 text-gray-600 hover:text-gray-800"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="group relative">
                            <div className={`text-xs px-2 py-1 rounded ${
                              response?.is_flagged 
                                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                : 'bg-gray-50 text-gray-800'
                            }`}>
                              {response?.raw_answer || '-'}
                            </div>
                            <button
                              onClick={() => handleEditStart(student.id, answerKey.question_number, response?.raw_answer || '')}
                              className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit2 className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Correct/Incorrect Indicator */}
                      <div className="flex items-center justify-center">
                        {grade?.is_correct ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      
                      {/* Points */}
                      <div className="text-xs text-gray-600">
                        {grade?.points_earned || 0}/{grade?.points_possible || answerKey.points}
                      </div>
                      
                      {/* OCR Confidence */}
                      {response && (
                        <div className={`text-xs ${
                          response.ocr_confidence < 0.65 ? 'text-yellow-600' : 'text-gray-500'
                        }`}>
                          {Math.round(response.ocr_confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </td>
                )
              })}
              
              {/* Total Score */}
              <td className="px-6 py-4 text-center">
                <div className="text-sm font-medium text-gray-900">
                  {student.stats.totalPointsEarned}/{student.stats.totalPointsPossible}
                </div>
                <div className="text-xs text-gray-500">
                  {student.correctCount}/{student.totalQuestions} correct
                </div>
              </td>
              
              {/* Letter Grade */}
              <td className="px-6 py-4 text-center">
                <div className="text-sm font-medium text-gray-900">
                  {student.stats.percentage}%
                </div>
                <div className={`text-xs font-medium ${
                  student.stats.percentage >= 90 ? 'text-green-600' :
                  student.stats.percentage >= 80 ? 'text-blue-600' :
                  student.stats.percentage >= 70 ? 'text-yellow-600' :
                  student.stats.percentage >= 60 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {student.stats.letterGrade}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {localStudents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No students found for this grading session.
        </div>
      )}
    </div>
  )
}

