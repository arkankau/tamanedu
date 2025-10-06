import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/supabase'
import { isAnswerCorrect } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    // Get all students for this session
    const studentsResult = await DatabaseService.getStudentsBySession(sessionId)
    
    if (studentsResult.error) {
      console.error('Error fetching students:', studentsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }
    
    const students = studentsResult.data || []
    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No students found for this session' },
        { status: 404 }
      )
    }
    
    // Get answer key for this session
    const answerKeysResult = await DatabaseService.getAnswerKeysBySession(sessionId)
    
    if (answerKeysResult.error) {
      console.error('Error fetching answer keys:', answerKeysResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch answer keys' },
        { status: 500 }
      )
    }
    
    const answerKeys = answerKeysResult.data || []
    if (answerKeys.length === 0) {
      return NextResponse.json(
        { error: 'No answer key found for this session' },
        { status: 404 }
      )
    }
    
    // Create answer key lookup (accepted_variants already parsed by DatabaseService)
    const answerKeyMap = new Map()
    answerKeys.forEach(key => {
      answerKeyMap.set(key.question_number, key)
    })
    
    const gradingResults = []
    
    // Grade each student
    for (const student of students) {
      // Get student responses
      const responsesResult = await DatabaseService.getResponsesByStudent(student.id)
      
      if (responsesResult.error) {
        console.error(`Error fetching responses for student ${student.id}:`, responsesResult.error)
        continue
      }
      
      const responses = responsesResult.data || []
      
      const studentGrades = []
      
      // Grade each response
      for (const response of responses) {
        const answerKey = answerKeyMap.get(response.question_number)
        
        if (!answerKey) {
          // No answer key for this question, skip
          continue
        }
        
        const isCorrect = isAnswerCorrect(
          response.normalized_answer,
          answerKey.correct_answer,
          answerKey.accepted_variants || []
        )
        
        const pointsEarned = isCorrect ? answerKey.points : 0
        
        studentGrades.push({
          student_id: student.id,
          question_number: response.question_number,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          points_possible: answerKey.points
        })
      }
      
      // Delete existing grades for this student
      const deleteResult = await DatabaseService.deleteGradesByStudent(student.id)
      
      if (deleteResult.error) {
        console.error(`Error deleting existing grades for student ${student.id}:`, deleteResult.error)
        continue
      }
      
      // Insert new grades
      if (studentGrades.length > 0) {
        const insertResult = await DatabaseService.createGrades(studentGrades)
        
        if (insertResult.error) {
          console.error(`Error inserting grades for student ${student.id}:`, insertResult.error)
          continue
        }
        
        const insertedGrades = insertResult.data || []
        
        // Calculate student totals
        const totalPointsEarned = studentGrades.reduce((sum, grade) => sum + grade.points_earned, 0)
        const totalPointsPossible = studentGrades.reduce((sum, grade) => sum + grade.points_possible, 0)
        const percentage = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0
        
        gradingResults.push({
          studentId: student.id,
          studentName: student.name,
          grades: insertedGrades,
          totalPointsEarned,
          totalPointsPossible,
          percentage: Math.round(percentage * 100) / 100
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      results: gradingResults,
      totalStudents: students.length,
      gradedStudents: gradingResults.length
    })
    
  } catch (error) {
    console.error('Grading error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

