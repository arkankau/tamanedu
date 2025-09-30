import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, name')
      .eq('session_id', sessionId)
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }
    
    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'No students found for this session' },
        { status: 404 }
      )
    }
    
    // Get answer key for this session
    const { data: answerKeys, error: answerKeysError } = await supabaseAdmin
      .from('answer_keys')
      .select('question_number, correct_answer, accepted_variants, points')
      .eq('session_id', sessionId)
      .order('question_number')
    
    if (answerKeysError) {
      console.error('Error fetching answer keys:', answerKeysError)
      return NextResponse.json(
        { error: 'Failed to fetch answer keys' },
        { status: 500 }
      )
    }
    
    if (!answerKeys || answerKeys.length === 0) {
      return NextResponse.json(
        { error: 'No answer key found for this session' },
        { status: 404 }
      )
    }
    
    // Create answer key lookup
    const answerKeyMap = new Map()
    answerKeys.forEach(key => {
      answerKeyMap.set(key.question_number, key)
    })
    
    const gradingResults = []
    
    // Grade each student
    for (const student of students) {
      // Get student responses
      const { data: responses, error: responsesError } = await supabaseAdmin
        .from('responses')
        .select('question_number, normalized_answer')
        .eq('student_id', student.id)
        .order('question_number')
      
      if (responsesError) {
        console.error(`Error fetching responses for student ${student.id}:`, responsesError)
        continue
      }
      
      const studentGrades = []
      
      // Grade each response
      for (const response of responses || []) {
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
      const { error: deleteError } = await supabaseAdmin
        .from('grades')
        .delete()
        .eq('student_id', student.id)
      
      if (deleteError) {
        console.error(`Error deleting existing grades for student ${student.id}:`, deleteError)
        continue
      }
      
      // Insert new grades
      if (studentGrades.length > 0) {
        const { data: insertedGrades, error: insertError } = await supabaseAdmin
          .from('grades')
          .insert(studentGrades)
          .select()
        
        if (insertError) {
          console.error(`Error inserting grades for student ${student.id}:`, insertError)
          continue
        }
        
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

