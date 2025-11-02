import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/chromadb'
import { calculateGradeStats } from '@/lib/utils'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, format, type } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    if (!format || !['csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be csv or pdf' },
        { status: 400 }
      )
    }
    
    if (!type || !['individual', 'summary'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be individual or summary' },
        { status: 400 }
      )
    }
    
    // Get session details (stub for now since ChromaDB stores it differently)
    const session = {
      title: 'Grading Session',
      description: '',
      created_at: new Date().toISOString()
    }
    
    // Get students with their grades and responses
    const studentsResult = await DatabaseService.getStudentsBySession(sessionId)
    
    if (studentsResult.error || !studentsResult.data) {
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }
    
    const students = await Promise.all(
      studentsResult.data.map(async (student: any) => {
        const gradesResult = await DatabaseService.getGradesByStudent(student.id)
        const responsesResult = await DatabaseService.getResponsesByStudent(student.id)
        
        return {
          id: student.id,
          name: student.name,
          student_id: student.student_id,
          grades: gradesResult.data || [],
          responses: responsesResult.data || []
        }
      })
    )
    
    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'No students found for this session' },
        { status: 404 }
      )
    }
    
    // Get answer keys for reference
    const answerKeysResult = await DatabaseService.getAnswerKeysBySession(sessionId)
    
    if (answerKeysResult.error) {
      console.error('Error fetching answer keys:', answerKeysResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch answer keys' },
        { status: 500 }
      )
    }
    
    const answerKeys = answerKeysResult.data || []
    
    if (format === 'csv') {
      if (type === 'individual') {
        return generateIndividualCSV(session, students, answerKeys)
      } else {
        return generateSummaryCSV(session, students, answerKeys)
      }
    } else {
      // PDF format - for now return JSON data that can be used to generate PDF on frontend
      return NextResponse.json({
        success: true,
        data: {
          session,
          students,
          answerKeys,
          type
        }
      })
    }
    
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateIndividualCSV(session: any, students: any[], answerKeys: any[]) {
  const csvData = []
  
  // Add header row
  csvData.push([
    'Session',
    'Student Name',
    'Student ID',
    'Question',
    'Student Answer',
    'Correct Answer',
    'Points Earned',
    'Points Possible',
    'Is Correct',
    'OCR Confidence',
    'Flagged'
  ])
  
  // Add data rows
  for (const student of students) {
    const grades = student.grades || []
    const responses = student.responses || []
    
    // Create lookup maps
    const gradeMap = new Map()
    const responseMap = new Map()
    
    grades.forEach((grade: any) => {
      gradeMap.set(grade.question_number, grade)
    })
    
    responses.forEach((response: any) => {
      responseMap.set(response.question_number, response)
    })
    
    // Add row for each question
    for (const answerKey of answerKeys) {
      const grade = gradeMap.get(answerKey.question_number)
      const response = responseMap.get(answerKey.question_number)
      
      csvData.push([
        session.title,
        student.name,
        student.student_id || '',
        answerKey.question_number,
        response?.raw_answer || '',
        answerKey.correct_answer,
        grade?.points_earned || 0,
        grade?.points_possible || answerKey.points,
        grade?.is_correct ? 'Yes' : 'No',
        response?.ocr_confidence ? Math.round(response.ocr_confidence * 100) + '%' : '',
        response?.is_flagged ? 'Yes' : 'No'
      ])
    }
  }
  
  const csv = Papa.unparse(csvData)
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${session.title} - Individual Results.csv"`
    }
  })
}

function generateSummaryCSV(session: any, students: any[], answerKeys: any[]) {
  const csvData = []
  
  // Add header row
  csvData.push([
    'Student Name',
    'Student ID',
    'Total Points Earned',
    'Total Points Possible',
    'Percentage',
    'Letter Grade',
    'Questions Correct',
    'Questions Total',
    'Flagged Answers'
  ])
  
  // Add data rows
  for (const student of students) {
    const grades = student.grades || []
    const responses = student.responses || []
    
    const stats = calculateGradeStats(grades)
    const correctCount = grades.filter((g: any) => g.is_correct).length
    const totalQuestions = answerKeys.length
    const flaggedCount = responses.filter((r: any) => r.is_flagged).length
    
    csvData.push([
      student.name,
      student.student_id || '',
      stats.totalPointsEarned,
      stats.totalPointsPossible,
      stats.percentage + '%',
      stats.letterGrade,
      correctCount,
      totalQuestions,
      flaggedCount
    ])
  }
  
  // Add class statistics
  csvData.push([]) // Empty row
  csvData.push(['CLASS STATISTICS'])
  
  const allGrades = students.flatMap(s => s.grades || [])
  const classStats = calculateGradeStats(allGrades)
  const classAverage = students.length > 0 
    ? students.reduce((sum, student) => {
        const studentStats = calculateGradeStats(student.grades || [])
        return sum + studentStats.percentage
      }, 0) / students.length
    : 0
  
  csvData.push(['Total Students', students.length])
  csvData.push(['Class Average', Math.round(classAverage * 100) / 100 + '%'])
  csvData.push(['Highest Score', Math.max(...students.map(s => calculateGradeStats(s.grades || []).percentage)) + '%'])
  csvData.push(['Lowest Score', Math.min(...students.map(s => calculateGradeStats(s.grades || []).percentage)) + '%'])
  
  const csv = Papa.unparse(csvData)
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${session.title} - Class Summary.csv"`
    }
  })
}
